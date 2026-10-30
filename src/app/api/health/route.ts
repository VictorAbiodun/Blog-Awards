import { connection } from "next/server";

import { evaluateConfiguration } from "@/lib/config/safety";

/**
 * Reports whether the server is configured safely. It never returns secret
 * values. Details about what is wrong are shown only outside production.
 */
export async function GET() {
  await connection(); // always evaluated per request, never prerendered

  const report = evaluateConfiguration(process.env);
  const healthy = report.problems.length === 0;
  const isProduction = report.environment === "production";

  return Response.json(
    {
      status: healthy ? "ok" : "misconfigured",
      environment: report.environment,
      payments: { enabled: report.paymentsEnabled, provider: report.paymentProvider },
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      ...(isProduction
        ? { problemCount: report.problems.length }
        : { problems: report.problems }),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
