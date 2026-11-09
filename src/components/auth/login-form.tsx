"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";
import { isDemoMode } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors, safeNext } from "@/lib/form";
import { loginSchema } from "@/lib/validation";
import { api, ApiError } from "@/services";
import { DEMO_ADMIN, DEMO_FAN } from "@/services/demo/seed";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<{ message: string; unconfirmed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const user = await api.login(parsed.data);
      refresh();
      router.replace(
        safeNext(
          params.get("next"),
          user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard"
        )
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "account_unavailable") {
        router.replace("/account-unavailable");
        return;
      }
      setProblem({ message: errorMessage(error), unconfirmed: error instanceof ApiError && error.code === "email_not_confirmed" });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {problem ? (
        <Notice>
          {problem.message}
          {problem.unconfirmed ? (
            <>
              {" "}
              <Link href={`/check-email?email=${encodeURIComponent(email.trim())}`} className="font-bold underline">
                Check your email
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
      <Field label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <PasswordField label="Password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <Link href="/forgot-password" className="w-fit text-lg font-semibold underline underline-offset-4">
        Forgot password?
      </Link>
      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Logging in\u2026" : "Log in"}
      </Button>
      <p className="text-lg text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
      {isDemoMode ? (
        <div className="bg-elevated p-4 text-base leading-[1.5] text-muted">
          <p className="font-semibold text-ink">Demo logins</p>
          <p>
            Fan: {DEMO_FAN.email} / {DEMO_FAN.password}
          </p>
          <p>
            Admin: {DEMO_ADMIN.email} / {DEMO_ADMIN.password}
          </p>
        </div>
      ) : null}
    </form>
  );
}
