import { z } from "zod";

import { nairaTextToKobo } from "./format";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address, like name@email.com."));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Tell us what to call you.")
  .max(60, "Use 60 characters or fewer.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.boolean().refine((value) => value, "Please agree to the Terms and the Privacy policy."),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const profileSchema = z.object({ displayName: displayNameSchema });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Repeat the new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

export const contactSchema = z.object({
  name: displayNameSchema,
  email: emailSchema,
  subject: z.enum(["general", "suggest-artist", "account", "payment"]),
  message: z.string().trim().min(10, "Write at least 10 characters.").max(2000, "Use 2,000 characters or fewer."),
});

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Enter a full link starting with https://");

export const artistFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the artist's name.").max(80, "Use 80 characters or fewer."),
  bio: z.string().trim().min(1, "Write a short biography.").max(1200, "Use 1,200 characters or fewer."),
  musicUrl: optionalUrl,
  socialUrl: optionalUrl,
  categoryIds: z.array(z.string()).min(1, "Choose at least one category."),
  status: z.enum(["draft", "published"]),
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a category name.").max(60, "Use 60 characters or fewer."),
  description: z.string().trim().min(1, "Describe what this award recognises.").max(300),
  eligibility: z.string().trim().min(1, "Say who or what can be voted for.").max(300),
});

export const refundSchema = z.object({
  reason: z.string().trim().min(10, "Explain why in at least 10 characters. It is recorded in the audit log."),
});

/** Validates a naira amount typed in the wallet against the season's limits. Returns kobo or an error message. */
export function parseTopUpAmount(
  text: string,
  limits: { minKobo: number; maxKobo: number },
  format: (kobo: number) => string,
): { ok: true; kobo: number } | { ok: false; error: string } {
  const kobo = nairaTextToKobo(text);
  if (kobo === null || kobo <= 0) return { ok: false, error: "Enter an amount in naira, like 1000." };
  if (kobo < limits.minKobo) return { ok: false, error: `The minimum is ${format(limits.minKobo)}.` };
  if (kobo > limits.maxKobo) return { ok: false, error: `The maximum is ${format(limits.maxKobo)}.` };
  return { ok: true, kobo };
}
