import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: requests, error } = await admin
      .from("funding_requests")
      .select("*, profiles:user_id(display_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (requests ?? []).map((r) => ({
      id: r.id,
      reference: r.reference,
      userId: r.user_id,
      fanLabel: r.profiles?.display_name ?? "You",
      requestedAmountNaira: r.requested_amount_naira,
      actualAmountNaira: r.actual_amount_naira ?? undefined,
      expectedPoints: r.expected_points,
      creditedPoints: r.credited_points ?? undefined,
      conversionRate: r.conversion_rate,
      status: r.status,
      rejectionReason: r.rejection_reason ?? undefined,
      submittedAt: r.submitted_at ?? undefined,
      approvedAt: r.approved_at ?? undefined,
      approvedBy: r.approved_by ?? undefined,
      createdAt: r.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
    }

    const body = await request.json();
    const amountNaira = Number(body.amountNaira);

    const nairaPerPoint = Number(process.env.CONVERSION_RATE_NAIRA_PER_POINT || 50);
    const rate = Number.isFinite(nairaPerPoint) && nairaPerPoint > 0 ? nairaPerPoint : 50;

    if (!amountNaira || amountNaira < rate || amountNaira % rate !== 0) {
      return NextResponse.json(
        { error: `Amount must be at least ₦${rate} and a multiple of ₦${rate}.` },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    // Find user's wallet
    let { data: wallet } = await admin
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!wallet) {
      // Auto-create wallet if missing
      const { data: newWallet, error: createWalletErr } = await admin
        .from("wallets")
        .insert({ user_id: user.id, currency: "NGN", status: "active" })
        .select("id")
        .single();

      if (createWalletErr || !newWallet) {
        return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
      }
      wallet = newWallet;
    }

    const shortId = user.id.replace(/-/g, "").substring(0, 6).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `FUND-${shortId}-${randomSuffix}`;
    const expectedPoints = Math.floor(amountNaira / rate);

    const { data: created, error: insertErr } = await admin
      .from("funding_requests")
      .insert({
        reference,
        user_id: user.id,
        wallet_id: wallet.id,
        requested_amount_naira: amountNaira,
        expected_points: expectedPoints,
        conversion_rate: rate,
        status: "awaiting_payment",
      })
      .select("*, profiles:user_id(display_name)")
      .single();

    if (insertErr || !created) {
      return NextResponse.json(
        { error: insertErr?.message || "Failed to create funding request" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: created.id,
      reference: created.reference,
      userId: created.user_id,
      fanLabel: created.profiles?.display_name ?? "You",
      requestedAmountNaira: created.requested_amount_naira,
      actualAmountNaira: created.actual_amount_naira ?? undefined,
      expectedPoints: created.expected_points,
      creditedPoints: created.credited_points ?? undefined,
      conversionRate: created.conversion_rate,
      status: created.status,
      rejectionReason: created.rejection_reason ?? undefined,
      submittedAt: created.submitted_at ?? undefined,
      approvedAt: created.approved_at ?? undefined,
      approvedBy: created.approved_by ?? undefined,
      createdAt: created.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

