import "server-only";

import { evaluateConfiguration, type ConfigurationReport } from "./safety";

/**
 * Server-only configuration. Importing this file from a client component is a
 * build error, which keeps secrets out of the browser bundle.
 */
export function getServerConfig(): ConfigurationReport & {
  supabaseServiceRoleKey: string | undefined;
} {
  const report = evaluateConfiguration(process.env);
  return {
    ...report,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  };
}
