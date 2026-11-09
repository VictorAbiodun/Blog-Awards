import { describe, expect, it } from "vitest";

import { formatNaira } from "./format";
import { artistFormSchema, changePasswordSchema, loginSchema, parseTopUpAmount, registerSchema } from "./validation";

describe("registerSchema", () => {
  const valid = { displayName: "Ada", email: "ada@example.com", password: "longenough1", acceptTerms: true };

  it("accepts good input", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("explains each problem in plain language", () => {
    const result = registerSchema.safeParse({ displayName: " ", email: "nope", password: "short", acceptTerms: false });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((i) => i.message).join(" | ");
    expect(messages).toMatch(/what to call you/i);
    expect(messages).toMatch(/valid email/i);
    expect(messages).toMatch(/at least 8 characters/i);
    expect(messages).toMatch(/agree to the Terms/i);
  });

  it("trims the email and display name", () => {
    const result = registerSchema.parse({ ...valid, displayName: "  Ada  ", email: "  ada@example.com " });
    expect(result.displayName).toBe("Ada");
    expect(result.email).toBe("ada@example.com");
  });
});

describe("loginSchema and changePasswordSchema", () => {
  it("needs both fields", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });

  it("checks that the new passwords match", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "old", newPassword: "newpassword1", confirmPassword: "different" });
    expect(result.success).toBe(false);
  });
});

describe("artistFormSchema", () => {
  it("requires a name, biography and a category, and valid links", () => {
    const base = { name: "X", bio: "Y", musicUrl: "", socialUrl: "", categoryIds: ["c-new"], status: "draft" as const };
    expect(artistFormSchema.safeParse(base).success).toBe(true);
    expect(artistFormSchema.safeParse({ ...base, categoryIds: [] }).success).toBe(false);
    expect(artistFormSchema.safeParse({ ...base, musicUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(artistFormSchema.safeParse({ ...base, socialUrl: "https://example.com/a" }).success).toBe(true);
  });
});

describe("parseTopUpAmount", () => {
  const limits = { minKobo: 25000, maxKobo: 5000000 };

  it("turns typed naira into integer kobo", () => {
    expect(parseTopUpAmount("1,000", limits, formatNaira)).toEqual({ ok: true, kobo: 100000 });
    expect(parseTopUpAmount("\u20a6250.50", limits, formatNaira)).toEqual({ ok: true, kobo: 25050 });
  });

  it("rejects amounts that are not money, or outside the limits", () => {
    expect(parseTopUpAmount("abc", limits, formatNaira)).toMatchObject({ ok: false });
    expect(parseTopUpAmount("-5", limits, formatNaira)).toMatchObject({ ok: false });
    expect(parseTopUpAmount("100", limits, formatNaira)).toMatchObject({ ok: false, error: expect.stringContaining("minimum") });
    expect(parseTopUpAmount("999999", limits, formatNaira)).toMatchObject({ ok: false, error: expect.stringContaining("maximum") });
  });
});
