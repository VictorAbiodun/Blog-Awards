"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, LinkButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { isDemoMode } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { forgotPasswordSchema } from "@/lib/validation";
import { api } from "@/services";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.requestPasswordReset(parsed.data.email);
      setSentTo(parsed.data.email);
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <Notice tone="info">If an account exists for {sentTo}, a link to choose a new password is on its way. Check your spam folder too.</Notice>
        {isDemoMode ? (
          <LinkButton href={`/reset-password?email=${encodeURIComponent(sentTo)}`} tone="elevated" size="lg" full>
            Demo: open the reset link
          </LinkButton>
        ) : null}
        <Link href="/login" className="w-fit text-lg font-semibold underline underline-offset-4">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {problem ? <Notice>{problem}</Notice> : null}
      <Field label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Sending\u2026" : "Send reset link"}
      </Button>
      <p className="text-lg text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
