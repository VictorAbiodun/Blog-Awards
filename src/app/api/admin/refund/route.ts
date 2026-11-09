import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const { paymentId, reason } = await request.json();

    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        { error: "A refund reason of at least 10 characters is required." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    // 1. Fetch payment
    const { data: payment, error: fetchErr } = await admin
      .from("payments")
      .select("*, profiles:user_id(display_name)")
      .eq("id", paymentId)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "verified") {
      return NextResponse.json(
        { error: "Only verified payments can be refunded." },
        { status: 400 },
      );
    }

    // 2. Check user's current wallet balance
    const { data: balanceData } = await admin.rpc("get_wallet_balance", {
      p_user_id: payment.user_id,
    });
    const currentBalance = typeof balanceData === "number" ? balanceData : 0;

    if (currentBalance < payment.amount_kobo) {
      return NextResponse.json(
        {
          error:
            "Cannot refund this payment: the fan has already spent these voting credits.",
        },
        { status: 400 },
      );
    }

    // 3. Insert refund ledger entry (negative debit from wallet)
    const { error: ledgerErr } = await admin.from("wallet_ledger").insert({
      wallet_id: payment.wallet_id,
      user_id: payment.user_id,
      entry_type: "refund",
      amount_kobo: -payment.amount_kobo,
      related_id: payment.id,
      description: `Refund for payment ${payment.reference}: ${reason.trim()}`,
    });

    if (ledgerErr) {
      return NextResponse.json({ error: ledgerErr.message }, { status: 500 });
    }

    // 4. Update payment status to refunded
    const { data: updatedPayment, error: updateErr } = await admin
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", payment.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 5. Append audit log
    await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: "issue_refund",
      entity_type: "payment",
      entity_id: payment.id,
      reason: reason.trim(),
      details: { amountKobo: payment.amount_kobo, reference: payment.reference },
    });

    return NextResponse.json({
      id: updatedPayment.id,
      reference: updatedPayment.reference,
      userId: updatedPayment.user_id,
      fanLabel: payment.profiles?.display_name ?? "Fan",
      amountKobo: updatedPayment.amount_kobo,
      status: updatedPayment.status,
      createdAt: updatedPayment.created_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

