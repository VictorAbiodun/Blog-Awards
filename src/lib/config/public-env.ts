import { z } from "zod";

/**
 * Variables that are safe to send to the browser.
 *
 * Next.js only inlines NEXT_PUBLIC_ variables when they are written out in
 * full (process.env.NEXT_PUBLIC_X), so every one is read explicitly below.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export class MissingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingConfigurationError";
  }
}

export interface PublicConfig {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/** Throws a readable error if the Supabase settings are missing or invalid. */
export function getPublicConfig(): PublicConfig {
  let appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelDomain =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (vercelDomain && (!appUrl || appUrl.includes("localhost") || appUrl.startsWith("http://"))) {
    appUrl = `https://${vercelDomain}`;
  }

  const result = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: appUrl || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new MissingConfigurationError(
      `Missing or invalid public configuration: ${fields}. Copy .env.example to .env.local and fill it in (see README).`,
    );
  }

  return {
    appUrl: result.data.NEXT_PUBLIC_APP_URL,
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
