import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicConfig } from "@/lib/config/public-env";
import { getServerConfig } from "@/lib/config/server-env";

/**
 * Supabase client with the service role key. It BYPASSES Row Level Security.
 *
 * Use it only in trusted server code that has already checked the caller's
 * permission (for example, an administrator action). Never pass it to, or
 * import it from, a client component.
 */
export function createSupabaseAdminClient() {
  const { supabaseServiceRoleKey } = getServerConfig();
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server only).");
  }

  const { supabaseUrl } = getPublicConfig();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
