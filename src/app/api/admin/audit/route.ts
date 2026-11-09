import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const admin = createSupabaseAdminClient();
  const { data: logs, error } = await admin
    .from("audit_logs")
    .select("*, profiles:user_id(display_name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (logs ?? []).map((entry) => ({
    id: entry.id,
    userId: entry.user_id,
    adminName: entry.profiles?.display_name ?? "Administrator",
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    details: typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details),
    reason: entry.reason ?? undefined,
    createdAt: entry.created_at,
  }));

  return NextResponse.json(formatted);
}

