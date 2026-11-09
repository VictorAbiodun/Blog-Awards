import "server-only";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function requireServerAdmin() {
  try {
    const admin = createSupabaseAdminClient();
    let user = null;

    // 1. Try Authorization header first (most reliable for client-to-API calls)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    }

    // 2. Fall back to cookie-based session
    if (!user) {
      try {
        const serverClient = await createSupabaseServerClient();
        const { data, error } = await serverClient.auth.getUser();
        if (!error && data?.user) {
          user = data.user;
        }
      } catch {
        // ignore cookie read error
      }
    }

    if (!user) {
      return { ok: false as const, error: "You must be signed in as an administrator.", status: 401, user: null };
    }

    // 3. Verify admin role using service-role client (bypasses RLS)
    const { data: roleRow, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || roleRow?.role !== "admin") {
      return { ok: false as const, error: "Access denied. Administrator privileges required.", status: 403, user };
    }

    return { ok: true as const, user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return { ok: false as const, error: message, status: 500, user: null };
  }
}

