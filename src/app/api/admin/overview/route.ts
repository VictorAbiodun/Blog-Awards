import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const admin = createSupabaseAdminClient();

  const [
    { count: totalVotesCount },
    { data: paymentsData },
    { count: publishedArtistsCount },
    { count: pendingFlagsCount },
    { data: auditData },
  ] = await Promise.all([
    admin.from("votes").select("*", { count: "exact", head: true }),
    admin.from("payments").select("amount_kobo").eq("status", "verified"),
    admin.from("artists").select("*", { count: "exact", head: true }).eq("status", "published"),
    admin.from("flags").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin
      .from("audit_logs")
      .select("*, profiles:user_id(display_name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const totalCreditsSoldKobo = (paymentsData ?? []).reduce(
    (sum, p) => sum + (p.amount_kobo ?? 0),
    0,
  );

  const overview = {
    totalVotes: totalVotesCount ?? 0,
    totalCreditsSoldKobo,
    publishedArtists: publishedArtistsCount ?? 0,
    pendingFlags: pendingFlagsCount ?? 0,
    recentAudit: (auditData ?? []).map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      adminName: entry.profiles?.display_name ?? "Administrator",
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      details: typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details),
      reason: entry.reason ?? undefined,
      createdAt: entry.created_at,
    })),
  };

  return NextResponse.json(overview);
}

