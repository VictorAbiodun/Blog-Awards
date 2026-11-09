import type { ZodError } from "zod";

/** Turns a Zod error into one message per field, keyed by field name. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Only allow redirects to pages on this site, never to another website. */
export function safeNext(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
