import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireServerAdmin } from "@/lib/supabase/admin-auth";

export async function POST(request: Request) {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const { requestId, actualAmountNaira } = await request.json();
    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
    }
    const amount = Number(actualAmountNaira);
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid actual amount received in Naira." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: result, error: rpcErr } = await admin.rpc("approve_funding_request", {
      p_request_id: requestId,
      p_actual_amount_naira: amount,
      p_admin_id: check.user.id,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    // Fetch the updated request record
    const { data: updated, error: fetchErr } = await admin
      .from("funding_requests")
      .select("*, profiles:user_id(display_name)")
      .eq("id", requestId)
      .single();

    if (fetchErr || !updated) {
      return NextResponse.json(result);
    }

    return NextResponse.json({
      id: updated.id,
      reference: updated.reference,
      userId: updated.user_id,
      fanLabel: updated.profiles?.display_name ?? `Fan (${updated.user_id.slice(0, 6)})`,
      requestedAmountNaira: updated.requested_amount_naira,
      actualAmountNaira: updated.actual_amount_naira ?? undefined,
      expectedPoints: updated.expected_points,
      creditedPoints: updated.credited_points ?? undefined,
      conversionRate: updated.conversion_rate,
      status: updated.status,
      rejectionReason: updated.rejection_reason ?? undefined,
      submittedAt: updated.submitted_at ?? undefined,
      approvedAt: updated.approved_at ?? undefined,
      approvedBy: updated.approved_by ?? undefined,
      createdAt: updated.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

