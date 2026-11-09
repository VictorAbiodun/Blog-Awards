/**
 * Configuration safety rules.
 *
 * This file is deliberately pure (no Next.js imports, no I/O) so the same
 * rules run at server start (src/instrumentation.ts), in the health endpoint
 * and in unit tests.
 *
 * The most important rule: simulated payments can never exist in production.
 */

export type AppEnvironment = "development" | "test" | "production";
export type PaymentProvider = "disabled" | "mock" | "paystack" | "opay_manual";

export type RawEnv = Record<string, string | undefined>;

export interface ConfigurationReport {
  environment: AppEnvironment;
  paymentProvider: PaymentProvider;
  paymentsEnabled: boolean;
  problems: string[];
}

const APP_ENVIRONMENTS: readonly string[] = ["development", "test", "production"];
const PAYMENT_PROVIDERS: readonly string[] = ["disabled", "mock", "paystack", "opay_manual"];
const TRUTHY = new Set(["true", "1", "yes", "on"]);
const PLACEHOLDER_PATTERN = /(your[-_]|replace[-_]?me|changeme|placeholder|xxxx)/i;

export class UnsafeConfigurationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      [
        "Unsafe or incomplete configuration. The application will not start:",
        ...problems.map((problem) => `  - ${problem}`),
      ].join("\n"),
    );
    this.name = "UnsafeConfigurationError";
    this.problems = problems;
  }
}

export function isTruthy(value: string | undefined): boolean {
  return value !== undefined && TRUTHY.has(value.trim().toLowerCase());
}

/**
 * A server counts as production if EITHER NODE_ENV or APP_ENV says so. That
 * closes the loophole of running a production build with APP_ENV=development.
 */
export function resolveEnvironment(env: RawEnv): AppEnvironment {
  if (env.NODE_ENV === "production" || env.APP_ENV === "production") {
    return "production";
  }
  if (env.APP_ENV === "test" || env.NODE_ENV === "test") {
    return "test";
  }
  return "development";
}

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

function isLocalHost(url: URL): boolean {
  return ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(url.hostname);
}

function checkPublicVariablesHoldNoSecrets(env: RawEnv, problems: string[]) {
  const secretValues = [env.SUPABASE_SERVICE_ROLE_KEY, env.PAYSTACK_SECRET_KEY].filter(present);

  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("NEXT_PUBLIC_")) continue;

    if (/(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD)/i.test(name)) {
      problems.push(
        `${name} looks like a secret but is exposed to the browser. Remove the NEXT_PUBLIC_ prefix.`,
      );
    }
    if (present(value) && (value.startsWith("sk_") || secretValues.includes(value))) {
      problems.push(`${name} contains a secret key. Public variables are sent to every visitor.`);
    }
  }
}

function checkProductionBasics(env: RawEnv, problems: string[]) {
  if (env.APP_ENV !== "production") {
    problems.push(
      `A production server must run with APP_ENV=production (currently "${env.APP_ENV ?? "unset"}").`,
    );
  }

  if (isTruthy(env.ALLOW_SIMULATED_PAYMENTS)) {
    problems.push("ALLOW_SIMULATED_PAYMENTS must be false in production. Simulated payments can never create real voting credits.");
  }
  if (isTruthy(env.NEXT_PUBLIC_DEMO_MODE)) {
    problems.push("NEXT_PUBLIC_DEMO_MODE must be false in production. Demo mode uses fake data and simulated payments.");
  }
  if (env.PAYMENT_PROVIDER === "mock") {
    problems.push("PAYMENT_PROVIDER=mock is not allowed in production.");
  }

  let appUrl = env.NEXT_PUBLIC_APP_URL;
  const vercelDomain = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  if (vercelDomain && (!appUrl || appUrl.includes("localhost") || appUrl.startsWith("http://"))) {
    appUrl = `https://${vercelDomain}`;
  }

  if (!present(appUrl)) {
    problems.push("NEXT_PUBLIC_APP_URL is required in production.");
  } else if (PLACEHOLDER_PATTERN.test(appUrl)) {
    problems.push("NEXT_PUBLIC_APP_URL still contains a placeholder value.");
  }

  const otherRequired = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  for (const name of otherRequired) {
    const value = env[name];
    if (!present(value)) {
      problems.push(`${name} is required in production.`);
    } else if (PLACEHOLDER_PATTERN.test(value)) {
      problems.push(`${name} still contains a placeholder value.`);
    }
  }

  if (present(appUrl)) {
    try {
      const url = new URL(appUrl);
      if (url.protocol !== "https:") problems.push("NEXT_PUBLIC_APP_URL must use https in production.");
      if (isLocalHost(url)) problems.push("NEXT_PUBLIC_APP_URL must not point at localhost in production.");
    } catch {
      problems.push("NEXT_PUBLIC_APP_URL is not a valid URL.");
    }
  }

  if (present(env.NEXT_PUBLIC_SUPABASE_URL)) {
    try {
      const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
      if (url.protocol !== "https:") problems.push("NEXT_PUBLIC_SUPABASE_URL must use https in production.");
      if (isLocalHost(url)) problems.push("NEXT_PUBLIC_SUPABASE_URL must not point at localhost in production.");
    } catch {
      problems.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
    }
  }

  if (isTruthy(env.PAYMENTS_ENABLED)) {
    if (env.PAYMENT_PROVIDER === "paystack") {
      if (!present(env.PAYSTACK_SECRET_KEY) || !env.PAYSTACK_SECRET_KEY.startsWith("sk_live_")) {
        problems.push("Production payments require a live Paystack secret key (sk_live_...).");
      }
      if (
        !present(env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) ||
        !env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith("pk_live_")
      ) {
        problems.push("Production payments require a live Paystack public key (pk_live_...).");
      }
    } else if (env.PAYMENT_PROVIDER === "opay_manual") {
      if (!present(env.OPAY_ACCOUNT_NAME) || PLACEHOLDER_PATTERN.test(env.OPAY_ACCOUNT_NAME)) {
        problems.push("OPAY_ACCOUNT_NAME is required in production when PAYMENT_PROVIDER=opay_manual.");
      }
      if (!present(env.OPAY_ACCOUNT_NUMBER) || PLACEHOLDER_PATTERN.test(env.OPAY_ACCOUNT_NUMBER)) {
        problems.push("OPAY_ACCOUNT_NUMBER is required in production when PAYMENT_PROVIDER=opay_manual.");
      }
    } else {
      problems.push("PAYMENTS_ENABLED=true in production requires PAYMENT_PROVIDER=opay_manual or PAYMENT_PROVIDER=paystack.");
    }
  }
}

function checkNonProductionSafety(env: RawEnv, problems: string[]) {
  if (present(env.PAYSTACK_SECRET_KEY) && env.PAYSTACK_SECRET_KEY.startsWith("sk_live_")) {
    problems.push("A live Paystack secret key (sk_live_...) must never be used outside production.");
  }
  if (
    present(env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) &&
    env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.startsWith("pk_live_")
  ) {
    problems.push("A live Paystack public key (pk_live_...) must never be used outside production.");
  }

  if (env.PAYMENT_PROVIDER === "mock" && !isTruthy(env.ALLOW_SIMULATED_PAYMENTS)) {
    problems.push("PAYMENT_PROVIDER=mock also needs ALLOW_SIMULATED_PAYMENTS=true, as an explicit development-only opt-in.");
  }

  if (
    isTruthy(env.PAYMENTS_ENABLED) &&
    env.PAYMENT_PROVIDER === "paystack" &&
    !(present(env.PAYSTACK_SECRET_KEY) && env.PAYSTACK_SECRET_KEY.startsWith("sk_test_"))
  ) {
    problems.push("Outside production, Paystack may only be enabled with a test secret key (sk_test_...).");
  }
}

export function evaluateConfiguration(env: RawEnv): ConfigurationReport {
  const problems: string[] = [];
  const environment = resolveEnvironment(env);

  if (present(env.APP_ENV) && !APP_ENVIRONMENTS.includes(env.APP_ENV)) {
    problems.push(`APP_ENV must be one of ${APP_ENVIRONMENTS.join(", ")} (got "${env.APP_ENV}").`);
  }

  let paymentProvider: PaymentProvider = "disabled";
  if (present(env.PAYMENT_PROVIDER)) {
    if (PAYMENT_PROVIDERS.includes(env.PAYMENT_PROVIDER)) {
      paymentProvider = env.PAYMENT_PROVIDER as PaymentProvider;
    } else {
      problems.push(`PAYMENT_PROVIDER must be one of ${PAYMENT_PROVIDERS.join(", ")} (got "${env.PAYMENT_PROVIDER}").`);
    }
  }

  const paymentsEnabled = isTruthy(env.PAYMENTS_ENABLED);
  if (paymentsEnabled && paymentProvider === "disabled") {
    problems.push("PAYMENTS_ENABLED=true but PAYMENT_PROVIDER is disabled. Choose a provider or switch payments off.");
  }

  checkPublicVariablesHoldNoSecrets(env, problems);

  if (environment === "production") {
    checkProductionBasics(env, problems);
  } else {
    checkNonProductionSafety(env, problems);
  }

  return { environment, paymentProvider, paymentsEnabled, problems };
}

export function assertSafeConfiguration(env: RawEnv): ConfigurationReport {
  const report = evaluateConfiguration(env);
  if (report.problems.length > 0) {
    throw new UnsafeConfigurationError(report.problems);
  }
  return report;
}
