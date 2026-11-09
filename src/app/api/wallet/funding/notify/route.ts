import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    const { reference } = await request.json();
    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "Reference is required." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Find request
    const { data: fundingReq, error: findErr } = await admin
      .from("funding_requests")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .single();

    if (findErr || !fundingReq) {
      return NextResponse.json({ error: "Funding request not found." }, { status: 404 });
    }

    if (fundingReq.status === "approved") {
      return NextResponse.json(
        { error: "This funding request has already been approved." },
        { status: 400 },
      );
    }

    if (fundingReq.status === "pending_verification") {
      // Already notified
      return NextResponse.json({
        id: fundingReq.id,
        reference: fundingReq.reference,
        status: fundingReq.status,
        submittedAt: fundingReq.submitted_at,
        message: "Payment notification already received.",
      });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("funding_requests")
      .update({
        status: "pending_verification",
        submitted_at: now,
      })
      .eq("id", fundingReq.id)
      .select("*, profiles:user_id(display_name)")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message || "Failed to notify payment." }, { status: 500 });
    }

    return NextResponse.json({
      id: updated.id,
      reference: updated.reference,
      userId: updated.user_id,
      fanLabel: updated.profiles?.display_name ?? "You",
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
