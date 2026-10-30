import { describe, expect, it } from "vitest";

import {
  assertSafeConfiguration,
  evaluateConfiguration,
  resolveEnvironment,
  UnsafeConfigurationError,
  type RawEnv,
} from "./safety";

const safeProduction: RawEnv = {
  NODE_ENV: "production",
  APP_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://awards.example.ng",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
  PAYMENTS_ENABLED: "false",
  PAYMENT_PROVIDER: "disabled",
  ALLOW_SIMULATED_PAYMENTS: "false",
};

const safeDevelopment: RawEnv = {
  NODE_ENV: "development",
  APP_ENV: "development",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  PAYMENTS_ENABLED: "false",
  PAYMENT_PROVIDER: "disabled",
};

describe("resolveEnvironment", () => {
  it("treats NODE_ENV=production as production even if APP_ENV says development", () => {
    expect(resolveEnvironment({ NODE_ENV: "production", APP_ENV: "development" })).toBe("production");
  });

  it("treats APP_ENV=production as production", () => {
    expect(resolveEnvironment({ NODE_ENV: "development", APP_ENV: "production" })).toBe("production");
  });

  it("defaults to development", () => {
    expect(resolveEnvironment({})).toBe("development");
  });

  it("recognises the test environment", () => {
    expect(resolveEnvironment({ NODE_ENV: "test" })).toBe("test");
  });
});

describe("production safety", () => {
  it("accepts a complete, safe production configuration", () => {
    expect(evaluateConfiguration(safeProduction).problems).toEqual([]);
    expect(() => assertSafeConfiguration(safeProduction)).not.toThrow();
  });

  it("refuses to start when simulated payments are allowed", () => {
    const env = { ...safeProduction, ALLOW_SIMULATED_PAYMENTS: "true" };
    expect(() => assertSafeConfiguration(env)).toThrow(UnsafeConfigurationError);
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/ALLOW_SIMULATED_PAYMENTS/);
  });

  it("refuses the mock payment provider", () => {
    const env = { ...safeProduction, PAYMENT_PROVIDER: "mock" };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/mock/);
  });

  it("cannot be bypassed by running a production server with APP_ENV=development", () => {
    const env = { ...safeProduction, APP_ENV: "development", ALLOW_SIMULATED_PAYMENTS: "true" };
    const report = evaluateConfiguration(env);
    expect(report.environment).toBe("production");
    expect(report.problems.length).toBeGreaterThan(0);
  });

  it("requires Supabase settings and the service role key", () => {
    const env = { ...safeProduction, SUPABASE_SERVICE_ROLE_KEY: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" };
    const problems = evaluateConfiguration(env).problems.join(" ");
    expect(problems).toMatch(/SUPABASE_SERVICE_ROLE_KEY is required/);
    expect(problems).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY is required/);
  });

  it("rejects placeholder values left in production", () => {
    const env = { ...safeProduction, NEXT_PUBLIC_SUPABASE_ANON_KEY: "your-supabase-anon-key" };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/placeholder/);
  });

  it("requires https and a non-local app URL", () => {
    const http = evaluateConfiguration({ ...safeProduction, NEXT_PUBLIC_APP_URL: "http://awards.example.ng" });
    expect(http.problems.join(" ")).toMatch(/must use https/);
    const local = evaluateConfiguration({ ...safeProduction, NEXT_PUBLIC_APP_URL: "https://localhost" });
    expect(local.problems.join(" ")).toMatch(/localhost/);
  });

  it("allows real payments only with the paystack provider and live keys", () => {
    const enabledWithoutKeys = { ...safeProduction, PAYMENTS_ENABLED: "true", PAYMENT_PROVIDER: "paystack" };
    expect(evaluateConfiguration(enabledWithoutKeys).problems.join(" ")).toMatch(/live Paystack secret key/);

    const testKeys = {
      ...enabledWithoutKeys,
      PAYSTACK_SECRET_KEY: "sk_test_abc",
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "pk_test_abc",
    };
    expect(evaluateConfiguration(testKeys).problems.length).toBeGreaterThan(0);

    const liveKeys = {
      ...enabledWithoutKeys,
      PAYSTACK_SECRET_KEY: "sk_live_abc",
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "pk_live_abc",
    };
    expect(evaluateConfiguration(liveKeys).problems).toEqual([]);
  });

  it("requires APP_ENV=production on a production server", () => {
    const env = { ...safeProduction, APP_ENV: undefined };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/APP_ENV=production/);
  });
});

describe("development and test safety", () => {
  it("accepts a plain development configuration", () => {
    expect(evaluateConfiguration(safeDevelopment).problems).toEqual([]);
  });

  it("lets the mock provider run only with the explicit opt-in", () => {
    const withoutOptIn = { ...safeDevelopment, PAYMENT_PROVIDER: "mock", PAYMENTS_ENABLED: "true" };
    expect(evaluateConfiguration(withoutOptIn).problems.join(" ")).toMatch(/ALLOW_SIMULATED_PAYMENTS=true/);

    const withOptIn = { ...withoutOptIn, ALLOW_SIMULATED_PAYMENTS: "true" };
    expect(evaluateConfiguration(withOptIn).problems).toEqual([]);
  });

  it("never allows live Paystack keys outside production", () => {
    const secret = evaluateConfiguration({ ...safeDevelopment, PAYSTACK_SECRET_KEY: "sk_live_abc" });
    expect(secret.problems.join(" ")).toMatch(/live Paystack secret key/);
    const publicKey = evaluateConfiguration({ ...safeDevelopment, NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "pk_live_abc" });
    expect(publicKey.problems.join(" ")).toMatch(/live Paystack public key/);
  });

  it("allows Paystack outside production only with a test secret key", () => {
    const live = { ...safeDevelopment, PAYMENTS_ENABLED: "true", PAYMENT_PROVIDER: "paystack" };
    expect(evaluateConfiguration({ ...live, PAYSTACK_SECRET_KEY: "pk_wrong" }).problems.join(" ")).toMatch(/test secret key/);
    expect(
      evaluateConfiguration({ ...live, PAYSTACK_SECRET_KEY: "sk_test_abc", NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "pk_test_abc" })
        .problems,
    ).toEqual([]);
  });

  it("flags payments that are enabled without a provider", () => {
    const env = { ...safeDevelopment, PAYMENTS_ENABLED: "true", PAYMENT_PROVIDER: "disabled" };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/PAYMENT_PROVIDER is disabled/);
  });

  it("rejects unknown values", () => {
    const env = { ...safeDevelopment, APP_ENV: "staging", PAYMENT_PROVIDER: "stripe" };
    const problems = evaluateConfiguration(env).problems.join(" ");
    expect(problems).toMatch(/APP_ENV must be one of/);
    expect(problems).toMatch(/PAYMENT_PROVIDER must be one of/);
  });
});

describe("secrets never reach the browser", () => {
  it("flags secret-looking NEXT_PUBLIC_ variable names", () => {
    const env = { ...safeDevelopment, NEXT_PUBLIC_PAYSTACK_SECRET_KEY: "anything" };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/Remove the NEXT_PUBLIC_ prefix/);
  });

  it("flags a secret value copied into a public variable", () => {
    const env = {
      ...safeDevelopment,
      SUPABASE_SERVICE_ROLE_KEY: "super-secret-value",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "super-secret-value",
    };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/contains a secret key/);
  });

  it("flags a Paystack secret key in a public variable", () => {
    const env = { ...safeDevelopment, NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "sk_test_abc" };
    expect(evaluateConfiguration(env).problems.join(" ")).toMatch(/contains a secret key/);
  });
});
