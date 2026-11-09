import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import type { AdminFundingOverview } from "@/types/domain";

export async function GET() {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createSupabaseAdminClient();

    const [
      { count: pendingCount },
      { count: approvedCount },
      { count: rejectedCount },
      { data: approvedData },
    ] = await Promise.all([
      admin
        .from("funding_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_verification"),
      admin
        .from("funding_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      admin
        .from("funding_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected"),
      admin
        .from("funding_requests")
        .select("actual_amount_naira, credited_points")
        .eq("status", "approved"),
    ]);

    const totalNairaReceived = (approvedData ?? []).reduce(
      (sum, r) => sum + (r.actual_amount_naira ?? 0),
      0,
    );
    const totalPointsCredited = (approvedData ?? []).reduce(
      (sum, r) => sum + (r.credited_points ?? 0),
      0,
    );

    const overview: AdminFundingOverview = {
      pendingCount: pendingCount ?? 0,
      approvedCount: approvedCount ?? 0,
      rejectedCount: rejectedCount ?? 0,
      totalPointsCredited,
      totalNairaReceived,
    };

    return NextResponse.json(overview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

