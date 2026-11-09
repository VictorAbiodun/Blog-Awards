import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireServerSuperAdmin } from "@/lib/supabase/admin-auth";

export async function POST(request: Request) {
  try {
    const check = await requireServerSuperAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const { targetUserId, role } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required." }, { status: 400 });
    }

    if (role !== "admin" && role !== "fan") {
      return NextResponse.json(
        { error: 'Invalid role. Only "admin" or "fan" can be assigned.' },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: result, error: rpcErr } = await admin.rpc("set_user_role", {
      p_target_user_id: targetUserId,
      p_new_role: role,
      p_operator_id: check.user.id,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
