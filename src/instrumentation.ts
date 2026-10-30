/**
 * Runs once when the Next.js server starts.
 *
 * It refuses to start the server when the configuration is unsafe, for example
 * when simulated payments are switched on in production. Checks are skipped
 * during `next build`, because builds run on machines that do not hold the
 * production secrets.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertSafeConfiguration } = await import("@/lib/config/safety");
  const report = assertSafeConfiguration(process.env);

  console.info(
    `[blog-award] configuration ok: environment=${report.environment}, payments=${
      report.paymentsEnabled ? `enabled (${report.paymentProvider})` : "off"
    }`,
  );
}
