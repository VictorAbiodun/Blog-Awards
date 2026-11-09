import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createSupabaseAdminClient();
    const { data: flags, error } = await admin
      .from("flags")
      .select("*, profiles:user_id(display_name)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (flags ?? []).map((f) => ({
      id: f.id,
      userId: f.user_id,
      userLabel: f.profiles?.display_name ?? "Unknown",
      kind: f.flag_type,
      severity: f.severity,
      reason: f.description,
      status: f.status,
      createdAt: f.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const { flagId } = await request.json();
    const admin = createSupabaseAdminClient();

    const { data: updated, error } = await admin
      .from("flags")
      .update({
        status: "reviewed",
        reviewed_by: check.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", flagId)
      .select("*, profiles:user_id(display_name)")
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: "review_flag",
      entity_type: "flag",
      entity_id: flagId,
      details: { status: "reviewed" },
    });

    return NextResponse.json({
      id: updated.id,
      userId: updated.user_id,
      userLabel: updated.profiles?.display_name ?? "Unknown",
      kind: updated.flag_type,
      severity: updated.severity,
      reason: updated.description,
      status: updated.status,
      createdAt: updated.created_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

