import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import type { ManagedUser, Role } from "@/types/domain";

export async function GET() {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createSupabaseAdminClient();

    // 1. Fetch auth users
    const { data: authData, error: authErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    // 2. Fetch profiles and roles
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("id, display_name"),
      admin.from("user_roles").select("user_id, role"),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));

    const users: ManagedUser[] = (authData.users ?? []).map((u) => {
      const role = (roleMap.get(u.id) as Role) || "fan";
      const displayName = profileMap.get(u.id) || (u.user_metadata?.display_name as string) || "Fan";
      return {
        id: u.id,
        email: u.email ?? "",
        displayName,
        role,
        createdAt: u.created_at,
      };
    });

    // Sort: super_admin first, then admin, then fans; secondary sort by createdAt desc
    const rolePriority: Record<Role, number> = {
      super_admin: 0,
      admin: 1,
      fan: 2,
    };

    users.sort((a, b) => {
      const diff = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

