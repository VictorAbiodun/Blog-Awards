"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { isDemoMode } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/error-message";
import { api } from "@/services";

export function CheckEmail() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    setMessage(null);
    try {
      await api.resendConfirmation(email);
      setMessage({ tone: "info", text: "We sent the link again. It can take a minute to arrive." });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xl leading-[1.45]">
        {email ? (
          <>
            We sent a confirmation link to <strong>{email}</strong>. Open it to finish setting up your account.
          </>
        ) : (
          "We sent you a confirmation link. Open it to finish setting up your account."
        )}
      </p>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button tone="elevated" size="lg" full disabled={busy || !email} onClick={resend}>
        {busy ? "Sending\u2026" : "Resend email"}
      </Button>
      <p className="text-base leading-[1.4] text-muted">Did not get it? Check your spam folder, then resend.</p>
      {isDemoMode ? (
        <Button
          tone="ground"
          size="md"
          full
          onClick={async () => {
            await api.confirmEmailDemo?.(email);
            router.push("/email-confirmed");
          }}
        >
          Demo: I opened the link
        </Button>
      ) : null}
      <Link href="/register" className="w-fit text-lg font-semibold underline underline-offset-4">
        Use a different email
      </Link>
    </div>
  );
}
