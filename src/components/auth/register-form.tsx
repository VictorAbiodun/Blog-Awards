"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, PasswordField } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { registerSchema } from "@/lib/validation";
import { api } from "@/services";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const parsed = registerSchema.safeParse({ displayName, email, password, acceptTerms });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { email: confirmedEmail } = await api.register({
        displayName: parsed.data.displayName,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      router.push(`/check-email?email=${encodeURIComponent(confirmedEmail)}`);
    } catch (error) {
      setProblem(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {problem ? <Notice>{problem}</Notice> : null}
      <Field label="Display name" autoComplete="nickname" placeholder="What should we call you?" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={errors.displayName} />
      <Field label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <PasswordField label="Password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="Use at least 8 characters." />
      <Checkbox
        checked={acceptTerms}
        onChange={(e) => setAcceptTerms(e.target.checked)}
        error={errors.acceptTerms}
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2">
              Terms
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy policy
            </Link>
            .
          </>
        }
      />
      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Creating account\u2026" : "Create account"}
      </Button>
      <p className="text-lg text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
