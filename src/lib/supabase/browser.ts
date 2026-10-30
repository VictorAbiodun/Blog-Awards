import { createBrowserClient } from "@supabase/ssr";

import { getPublicConfig } from "@/lib/config/public-env";

/** Supabase client for client components. Uses only the public anon key. */
export function createSupabaseBrowserClient() {
  const config = getPublicConfig();
  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}
