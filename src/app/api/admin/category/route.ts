import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await request.json();
    const admin = createSupabaseAdminClient();

    if (body.type === "set_status") {
      const { data: updated, error: updateErr } = await admin
        .from("categories")
        .update({ status: body.status })
        .eq("id", body.categoryId)
        .select()
        .single();

      if (updateErr || !updated) {
        return NextResponse.json({ error: updateErr?.message ?? "Update failed" }, { status: 500 });
      }

      await admin.from("audit_logs").insert({
        user_id: check.user.id,
        action: "set_category_status",
        entity_type: "category",
        entity_id: body.categoryId,
        details: { status: body.status },
      });

      return NextResponse.json({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        eligibility: updated.eligibility,
        status: updated.status,
      });
    }

    // Add category
    const { data: currentSeason } = await admin
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single();

    if (!currentSeason) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("categories")
      .insert({
        season_id: currentSeason.id,
        name: body.name,
        description: body.description,
        eligibility: body.eligibility,
        status: "open",
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message ?? "Insert failed" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: "add_category",
      entity_type: "category",
      entity_id: inserted.id,
      details: { name: body.name },
    });

    return NextResponse.json({
      id: inserted.id,
      name: inserted.name,
      description: inserted.description,
      eligibility: inserted.eligibility,
      status: inserted.status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

