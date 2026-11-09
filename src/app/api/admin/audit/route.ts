import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuditEntry } from "@/types/domain";

export async function GET() {
  try {
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

    const formatted: AuditEntry[] = (logs ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      actor: entry.profiles?.display_name ?? "Administrator",
      reason: entry.reason ?? undefined,
      createdAt: entry.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

