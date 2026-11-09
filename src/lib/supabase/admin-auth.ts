import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireServerAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, error: "not_signed_in", status: 401, user: null };
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (roleError || roleRow?.role !== "admin") {
    return { ok: false as const, error: "forbidden", status: 403, user };
  }

  return { ok: true as const, user };
}

