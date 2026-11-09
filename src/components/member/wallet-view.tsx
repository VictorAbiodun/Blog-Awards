"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { ChoiceTile, ErrorBlock, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useUser } from "@/hooks/session";
import { useAsync } from "@/hooks/use-async";
import { TOP_UP_CHOICES_KOBO } from "@/lib/constants";
import { errorMessage } from "@/lib/error-message";
import { formatDate, formatNaira, formatSignedNaira, pluralise } from "@/lib/format";
import { parseTopUpAmount } from "@/lib/validation";
import { api } from "@/services";
import type { Payment } from "@/types/domain";

type Result = { tone: "info" | "error"; text: string } | null;

const statusWord: Record<Payment["status"], string> = { pending: "Pending", verified: "Verified", failed: "Failed", refunded: "Refunded" };

export function WalletView() {
  const user = useUser();
  const load = useCallback(() => api.getWallet(), []);
  const { state, reload, refresh } = useAsync(load);
  const returnedReference = useSearchParams().get("reference");

  const [choice, setChoice] = useState<number | "custom">(100000);
  const [customText, setCustomText] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>();
  const [demoRef, setDemoRef] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [checking, setChecking] = useState(Boolean(returnedReference));

  // Coming back from the payment provider: a redirect is NOT proof of payment,
  // so ask the server for the payment's real status until it is no longer pending.
  useEffect(() => {
    if (!returnedReference) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      try {
        const payment = await api.getPaymentStatus(returnedReference);
        if (cancelled) return;
        if (payment.status === "pending" && attempts < 10) {
          attempts += 1;
          setTimeout(poll, 1500);
          return;
        }
        setChecking(false);
        refresh();
        setResult(
          payment.status === "verified"
            ? { tone: "info", text: `Payment verified. ${formatNaira(payment.amountKobo)} was added to your wallet.` }
            : payment.status === "pending"
              ? { tone: "info", text: "Your payment is still being verified. Your balance updates as soon as it is confirmed." }
              : { tone: "error", text: "That payment was not completed, so no credits were added." },
        );
      } catch (error) {
        if (cancelled) return;
        setChecking(false);
        setResult({ tone: "error", text: errorMessage(error) });
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [returnedReference, refresh]);

  if (state.status === "loading") return <LoadingBlock label="Loading your wallet" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const { balanceKobo, season, payments, debits } = state.data;
  const limits = { minKobo: season.minTopUpKobo, maxKobo: season.maxTopUpKobo };
  const confirmed = user?.emailConfirmed ?? false;

  async function submit() {
    setResult(null);
    const parsed =
      choice === "custom"
        ? parseTopUpAmount(customText, limits, formatNaira)
        : parseTopUpAmount(String(choice / 100), limits, formatNaira);
    if (!parsed.ok) {
      setAmountError(parsed.error);
      return;
    }
    setAmountError(undefined);
    setBusy(true);
    try {
      const start = await api.startTopUp(parsed.kobo);
      if (start.kind === "redirect") {
        window.location.assign(start.url);
        return;
      }
      setDemoRef(start.reference);
    } catch (error) {
      setResult({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function finishDemo(outcome: "success" | "failure") {
    if (!demoRef || !api.completeDemoTopUp) return;
    setBusy(true);
    try {
      const payment = await api.completeDemoTopUp(demoRef, outcome);
      setResult(
        payment.status === "verified"
          ? { tone: "info", text: `Payment verified. ${formatNaira(payment.amountKobo)} was added to your wallet.` }
          : { tone: "error", text: "The payment failed, so no credits were added." },
      );
      setDemoRef(null);
      refresh();
    } catch (error) {
      setResult({ tone: "error", text: errorMessage(error) });
      setDemoRef(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16 md:pb-24">
      <h1 className="px-5 pb-6 pt-6 font-display text-[24vw] uppercase leading-[0.88] tracking-[-0.02em] md:px-6 md:pb-12 md:pt-12 md:text-[min(15.3vw,13.8rem)]">Your wallet.</h1>

      {checking ? (
        <div className="px-5 pb-6 md:px-6">
          <Notice tone="info">We are checking your payment with the provider. This usually takes a few seconds.</Notice>
        </div>
      ) : null}
      {result ? (
        <div className="px-5 pb-6 md:px-6">
          <Notice tone={result.tone}>{result.text}</Notice>
        </div>
      ) : null}

      <div className="grid gap-1.5 px-5 md:grid-cols-12 md:items-start md:gap-2 md:px-6">
        <div className="flex min-h-[300px] flex-col justify-between gap-6 bg-mint p-5 text-on-color md:col-span-5 md:h-[420px] md:p-7">
          <div>
            <p className="text-xl font-medium md:text-[22px]">Available voting credits</p>
            <p className="font-display text-[140px] leading-[0.85] tracking-[-0.02em] md:text-[clamp(140px,14.6vw,210px)]">{formatNaira(balanceKobo)}</p>
          </div>
          <p className="max-w-[500px] text-lg leading-[1.35] md:text-xl">
            Voting credits are prepaid credits, not a bank deposit. They cannot be transferred or withdrawn as cash.
          </p>
        </div>

        <section aria-labelledby="add-title" className="flex flex-col gap-5 bg-elevated p-5 md:col-span-7 md:mt-[60px] md:p-7">
          <h2 id="add-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Add credits
          </h2>
          {!confirmed ? (
            <Notice>
              Confirm your email before you add credits.{" "}
              <Link href={`/check-email?email=${encodeURIComponent(user?.email ?? "")}`} className="font-bold underline">
                Check your email
              </Link>
            </Notice>
          ) : null}
          <div role="group" aria-label="Suggested amounts" className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {TOP_UP_CHOICES_KOBO.map((kobo) => (
              <ChoiceTile key={kobo} tall selected={choice === kobo} onClick={() => { setChoice(kobo); setAmountError(undefined); }}>
                {formatNaira(kobo)}
              </ChoiceTile>
            ))}
            <button
              type="button"
              aria-pressed={choice === "custom"}
              onClick={() => setChoice("custom")}
              className={`flex h-24 items-center justify-center text-xl font-bold md:h-28 ${choice === "custom" ? "bg-gold text-on-color" : "bg-ground text-ink"}`}
            >
              {choice === "custom" ? "Custom: selected" : "Custom"}
            </button>
          </div>
          <Field
            tone="ground"
            label="Custom amount"
            inputMode="decimal"
            placeholder="Enter an amount in naira"
            value={customText}
            onFocus={() => setChoice("custom")}
            onChange={(event) => {
              setChoice("custom");
              setCustomText(event.target.value);
            }}
            error={choice === "custom" ? amountError : undefined}
            hint={`Minimum ${formatNaira(season.minTopUpKobo)} and maximum ${formatNaira(season.maxTopUpKobo)}. The server sets these limits and checks them again.`}
          />
          {choice !== "custom" && amountError ? <Notice>{amountError}</Notice> : null}
          <Button size="lg" full disabled={busy || !confirmed} onClick={submit}>
            {busy ? "Please wait\u2026" : "Continue to secure checkout"}
          </Button>
          <p className="text-base leading-[1.4] text-muted">Any payment-provider fee is shown at checkout, before you confirm.</p>
        </section>
      </div>

      <div className="mt-16 grid gap-12 px-5 md:mt-24 md:grid-cols-2 md:gap-2 md:px-6">
        <section aria-labelledby="pay-title" className="flex flex-col gap-5">
          <h2 id="pay-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Payment history
          </h2>
          {payments.length === 0 ? (
            <p className="text-xl text-muted">No payments yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 md:flex-nowrap">
                  <span className="text-lg text-muted md:w-[70px]">{formatDate(payment.createdAt)}</span>
                  <span className="min-w-0 flex-1 text-xl font-medium">Top-up {formatNaira(payment.amountKobo)}</span>
                  <span className="text-lg font-semibold md:w-[90px]">{statusWord[payment.status]}</span>
                  <span className="text-xl font-semibold md:w-[100px] md:text-right">{payment.status === "verified" ? formatSignedNaira(payment.amountKobo) : formatNaira(payment.status === "failed" ? 0 : payment.amountKobo)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="debit-title" className="flex flex-col gap-5">
          <h2 id="debit-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Voting debits
          </h2>
          {debits.length === 0 ? (
            <p className="text-xl text-muted">You have not voted yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {debits.map((receipt) => (
                <li key={receipt.id} className="flex flex-wrap items-baseline justify-between gap-x-4 md:flex-nowrap">
                  <span className="text-lg text-muted md:w-[70px]">{formatDate(receipt.createdAt)}</span>
                  <Link href={`/receipts/${receipt.id}`} className="min-w-0 flex-1 text-xl font-medium underline-offset-4 hover:underline">
                    {receipt.artistName} <span className="text-base text-muted">&middot; {receipt.categoryName}</span>
                  </Link>
                  <span className="text-lg md:w-[70px]">{pluralise(receipt.votes, "vote")}</span>
                  <span className="text-xl font-semibold md:w-[90px] md:text-right">{formatSignedNaira(-receipt.totalKobo)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-16 grid gap-12 px-5 md:mt-24 md:grid-cols-2 md:gap-2 md:px-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-[30px] font-bold leading-[1.1] md:text-4xl">Fees and refunds</h2>
          <p className="max-w-[560px] text-lg leading-[1.5] md:text-xl">
            Any payment-provider fee is shown before you confirm. Refunds follow the <Link href="/refunds" className="underline underline-offset-4">published refund policy</Link> and applicable law, and refunded payments appear in your history.
          </p>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="text-[30px] font-bold leading-[1.1] md:text-4xl">Unused credits</h2>
          <p className="max-w-[560px] text-lg leading-[1.5] md:text-xl">
            What happens to unused credits when a season ends is stated in the refund policy before you fund your wallet. Credits are for voting only.
          </p>
        </section>
      </div>

      <Dialog open={demoRef !== null} onClose={() => setDemoRef(null)} title="Demo checkout">
        <p className="text-lg leading-[1.45]">
          This stands in for the payment provider&rsquo;s checkout page. <strong>No real money moves.</strong> Reference: {demoRef}
        </p>
        <div className="flex flex-col gap-2">
          <Button size="lg" full disabled={busy} onClick={() => finishDemo("success")}>
            Simulate a successful payment
          </Button>
          <Button tone="ground" size="lg" full disabled={busy} onClick={() => finishDemo("failure")}>
            Simulate a failed payment
          </Button>
          <Button tone="ground" size="lg" full disabled={busy} onClick={() => setDemoRef(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
