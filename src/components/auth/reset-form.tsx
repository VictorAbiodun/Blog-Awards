"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { passwordSchema } from "@/lib/validation";
import { api } from "@/services";

const schema = z
  .object({ newPassword: passwordSchema, confirmPassword: z.string().min(1, "Repeat the new password.") })
  .refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"], message: "The two passwords do not match." });

/** The page a reset link opens: choose a new password. */
export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const parsed = schema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.completePasswordReset({ newPassword: parsed.data.newPassword, email: params.get("email") ?? undefined });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (error) {
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="info">Your password is changed. Taking you to log in&hellip;</Notice>
        <Link href="/login" className="w-fit text-lg font-semibold underline underline-offset-4">
          Log in now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {problem ? <Notice>{problem}</Notice> : null}
      <PasswordField label="New password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={errors.newPassword} hint="Use at least 8 characters." />
      <PasswordField label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} />
      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Saving\u2026" : "Save new password"}
      </Button>
    </form>
  );
}
