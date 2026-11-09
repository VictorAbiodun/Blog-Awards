import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireServerAdmin } from "@/lib/supabase/admin-auth";

export async function GET(request: Request) {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("funding_requests")
      .select("*, profiles:user_id(display_name)")
      .order("created_at", { ascending: false });

    if (filter && filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data: requests, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (requests ?? []).map((r) => ({
      id: r.id,
      reference: r.reference,
      userId: r.user_id,
      fanLabel: r.profiles?.display_name ?? `Fan (${r.user_id.slice(0, 6)})`,
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

