import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminOverview } from "@/types/domain";

export async function GET() {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createSupabaseAdminClient();

    const [
      { count: totalVotesCount },
      { data: paymentsData },
      { count: pendingPaymentsCount },
      { count: draftArtistsCount },
      { count: pendingFlagsCount },
      { data: auditData },
    ] = await Promise.all([
      admin.from("votes").select("*", { count: "exact", head: true }),
      admin.from("payments").select("amount_kobo").eq("status", "verified"),
      admin.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("artists").select("*", { count: "exact", head: true }).eq("status", "draft"),
      admin.from("flags").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin
        .from("audit_logs")
        .select("*, profiles:user_id(display_name)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const verifiedPaymentsKobo = (paymentsData ?? []).reduce(
      (sum, p) => sum + (p.amount_kobo ?? 0),
      0,
    );

    const overview: AdminOverview = {
      verifiedPaymentsKobo,
      votesCast: totalVotesCount ?? 0,
      openFlags: pendingFlagsCount ?? 0,
      draftArtists: draftArtistsCount ?? 0,
      pendingPayments: pendingPaymentsCount ?? 0,
      recentActions: (auditData ?? []).map((entry) => ({
        id: entry.id,
        action: entry.action,
        actor: entry.profiles?.display_name ?? "Administrator",
        reason: entry.reason ?? undefined,
        createdAt: entry.created_at,
      })),
    };

    return NextResponse.json(overview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

