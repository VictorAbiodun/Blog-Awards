"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { ChoiceTile, ErrorBlock, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useUser } from "@/hooks/session";
import { useAsync } from "@/hooks/use-async";
import { FUNDING_PRESET_AMOUNTS_NAIRA } from "@/lib/constants";
import { errorMessage } from "@/lib/error-message";
import { formatDate, formatNaira, formatNumber, pluralise } from "@/lib/format";
import { api } from "@/services";
import type { FundingConfig, FundingRequest, FundingRequestStatus } from "@/types/domain";

type Result = { tone: "info" | "error"; text: string } | null;

const statusBadge: Record<FundingRequestStatus, { label: string; className: string }> = {
  awaiting_payment: { label: "Awaiting Payment", className: "bg-surface-sunken text-muted" },
  pending_verification: { label: "Pending Verification", className: "bg-orange text-on-color" },
  approved: { label: "Approved", className: "bg-mint text-on-color" },
  rejected: { label: "Rejected", className: "bg-red-600 text-white" },
  expired: { label: "Expired", className: "bg-surface-sunken text-muted" },
};

export function WalletView() {
  const user = useUser();
  const load = useCallback(() => api.getWallet(), []);
  const { state, reload, refresh } = useAsync(load);

  const [choice, setChoice] = useState<number | "custom">(1000);
  const [customText, setCustomText] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  // Active funding request dialog
  const [activeRequest, setActiveRequest] = useState<FundingRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [notifying, setNotifying] = useState(false);

  if (state.status === "loading") return <LoadingBlock label="Loading your wallet" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const { balanceKobo, balancePoints, debits } = state.data;
  const currentPoints = balancePoints ?? balanceKobo;
  const confirmed = user?.emailConfirmed ?? false;

  const config: FundingConfig = state.data.fundingConfig ?? {
    bankName: "OPay",
    accountName: "Abiodun Victor Iyanuoluwa",
    accountNumber: "9159151577",
    nairaPerPoint: 50,
    minAmountNaira: 50,
  };

  const requests: FundingRequest[] = state.data.fundingRequests ?? [];
  const historicalPayments = state.data.payments ?? [];

  // Compute selected amount & equivalent points dynamically
  const selectedAmountNaira: number = (() => {
    if (choice !== "custom") return choice;
    const num = Number(customText.trim());
    return Number.isFinite(num) && num > 0 ? num : 0;
  })();

  const dynamicPoints = Math.floor(selectedAmountNaira / config.nairaPerPoint);

  function handleCustomInput(raw: string) {
    setChoice("custom");
    setCustomText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setAmountError("Enter an amount in Naira.");
      return;
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num)) {
      setAmountError("Please enter a whole number of Naira.");
      return;
    }
    if (num < config.minAmountNaira) {
      setAmountError(`Minimum amount is ₦${config.minAmountNaira}.`);
      return;
    }
    if (num % config.nairaPerPoint !== 0) {
      setAmountError(`Amount must be a multiple of ₦${config.minAmountNaira} to avoid fractional points.`);
      return;
    }
    setAmountError(undefined);
  }

  async function handleContinueToPayment() {
    setResult(null);
    const amount = choice === "custom" ? Number(customText.trim()) : choice;

    if (!amount || amount < config.minAmountNaira || amount % config.nairaPerPoint !== 0) {
      setAmountError(`Amount must be at least ₦${config.minAmountNaira} and a multiple of ₦${config.nairaPerPoint}.`);
      return;
    }

    setAmountError(undefined);
    setBusy(true);

    try {
      const created = await api.createFundingRequest(amount);
      setActiveRequest(created);
      refresh();
    } catch (error) {
      setResult({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function handleNotifyPayment() {
    if (!activeRequest) return;
    setNotifying(true);
    try {
      const updated = await api.notifyPaymentMade(activeRequest.reference);
      setActiveRequest(updated);
      setResult({
        tone: "info",
        text: "Your payment notification has been received. Your points will be credited within approximately 5 minutes after successful payment verification.",
      });
      refresh();
    } catch (error) {
      setResult({ tone: "error", text: errorMessage(error) });
    } finally {
      setNotifying(false);
    }
  }

  function handleCopyReference(ref: string) {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="pb-16 md:pb-24">
      <h1 className="px-5 pb-6 pt-6 font-display text-[24vw] uppercase leading-[0.88] tracking-[-0.02em] md:px-6 md:pb-12 md:pt-12 md:text-[min(15.3vw,13.8rem)]">
        Your wallet.
      </h1>

      {result ? (
        <div className="px-5 pb-6 md:px-6">
          <Notice tone={result.tone}>{result.text}</Notice>
        </div>
      ) : null}

      <div className="grid gap-1.5 px-5 md:grid-cols-12 md:items-start md:gap-2 md:px-6">
        {/* Points Balance Card */}
        <div className="flex min-h-[300px] flex-col justify-between gap-6 bg-mint p-5 text-on-color md:col-span-5 md:h-[440px] md:p-7">
          <div>
            <p className="text-xl font-medium md:text-[22px]">Available points balance</p>
            <p className="font-display text-[110px] leading-[0.85] tracking-[-0.02em] md:text-[clamp(110px,12vw,180px)]">
              {formatNumber(currentPoints)}
            </p>
            <p className="text-xl font-semibold opacity-90">
              {pluralise(currentPoints, "Point")}
            </p>
            <p className="mt-2 text-base opacity-75">
              1 Point = ₦{config.nairaPerPoint} &middot; Equivalent: {formatNaira(currentPoints * config.nairaPerPoint * 100)}
            </p>
          </div>
          <p className="max-w-[500px] text-lg leading-[1.35] md:text-xl">
            Points are used exclusively to cast votes for nominated artists. Points cannot be withdrawn as cash.
          </p>
        </div>

        {/* Fund Points Wallet Form */}
        <section aria-labelledby="fund-title" className="flex flex-col gap-5 bg-elevated p-5 md:col-span-7 md:p-7">
          <div>
            <h2 id="fund-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
              Fund Wallet
            </h2>
            <p className="mt-1 text-base text-muted md:text-lg">
              Conversion rate: <strong>₦{config.nairaPerPoint} = 1 Point</strong>. Transfer directly via OPay.
            </p>
          </div>

          {!confirmed ? (
            <Notice>
              Confirm your email before you fund your wallet.{" "}
              <Link href={`/check-email?email=${encodeURIComponent(user?.email ?? "")}`} className="font-bold underline">
                Check your email
              </Link>
            </Notice>
          ) : null}

          {/* Suggested Amounts */}
          <div>
            <label className="mb-2 block text-base font-semibold">Choose an amount</label>
            <div role="group" aria-label="Suggested amounts" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3">
              {FUNDING_PRESET_AMOUNTS_NAIRA.map((naira) => {
                const points = Math.floor(naira / config.nairaPerPoint);
                return (
                  <ChoiceTile
                    key={naira}
                    tall
                    selected={choice === naira}
                    onClick={() => {
                      setChoice(naira);
                      setAmountError(undefined);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xl font-bold">₦{formatNumber(naira)}</span>
                      <span className="text-sm font-medium opacity-80">{points} Points</span>
                    </div>
                  </ChoiceTile>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="flex flex-col gap-2">
            <Field
              tone="ground"
              label="Or enter custom amount (₦)"
              inputMode="numeric"
              placeholder={`Multiples of ₦${config.nairaPerPoint}, e.g. 1500`}
              value={choice === "custom" ? customText : ""}
              onFocus={() => setChoice("custom")}
              onChange={(e) => handleCustomInput(e.target.value)}
              error={choice === "custom" ? amountError : undefined}
              hint={`Minimum ₦${config.minAmountNaira}. Must be a multiple of ₦${config.nairaPerPoint}.`}
            />

            {/* Dynamic Points Calculation */}
            {selectedAmountNaira > 0 ? (
              <div className="flex items-center justify-between bg-ground p-3 text-lg font-semibold">
                <span className="text-muted">You will receive:</span>
                <span className="text-xl font-bold text-ink">
                  {formatNumber(dynamicPoints)} {dynamicPoints === 1 ? "Point" : "Points"}
                </span>
              </div>
            ) : null}
          </div>

          {choice !== "custom" && amountError ? <Notice>{amountError}</Notice> : null}

          <Button size="lg" full disabled={busy || !confirmed || selectedAmountNaira <= 0} onClick={handleContinueToPayment}>
            {busy ? "Generating request\u2026" : "Continue to Payment"}
          </Button>

          <p className="text-base leading-[1.4] text-muted">
            After clicking Continue, you will be given our OPay account details and a unique payment reference to complete the bank transfer.
          </p>
        </section>
      </div>

      {/* Funding Requests History */}
      <div className="mt-16 grid gap-12 px-5 md:mt-24 md:grid-cols-2 md:gap-6 md:px-6">
        <section aria-labelledby="requests-title" className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <h2 id="requests-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
              Funding History
            </h2>
            <button
              type="button"
              onClick={() => refresh()}
              className="text-base font-semibold underline underline-offset-4 text-muted hover:text-ink"
            >
              Refresh
            </button>
          </div>

          {requests.length === 0 ? (
            <p className="text-xl text-muted">No funding requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-lg">
                <thead className="text-base text-muted">
                  <tr>
                    <th scope="col" className="pb-2 font-normal">Reference</th>
                    <th scope="col" className="pb-2 font-normal">Amount</th>
                    <th scope="col" className="pb-2 font-normal">Points</th>
                    <th scope="col" className="pb-2 font-normal">Status</th>
                    <th scope="col" className="pb-2 font-normal"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req) => {
                    const badge = statusBadge[req.status] || { label: req.status, className: "bg-surface-sunken" };
                    return (
                      <tr key={req.id}>
                        <td className="py-3 pr-2 font-mono text-base font-medium">
                          {req.reference}
                          <span className="block text-sm text-muted font-sans">{formatDate(req.createdAt)}</span>
                        </td>
                        <td className="py-3 pr-2 font-semibold">
                          ₦{formatNumber(req.actualAmountNaira ?? req.requestedAmountNaira)}
                        </td>
                        <td className="py-3 pr-2 font-medium">
                          {formatNumber(req.creditedPoints ?? req.expectedPoints)} pts
                        </td>
                        <td className="py-3 pr-2">
                          <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {req.status === "awaiting_payment" ? (
                            <button
                              type="button"
                              onClick={() => setActiveRequest(req)}
                              className="text-sm font-semibold underline underline-offset-4"
                            >
                              Pay now
                            </button>
                          ) : null}
                          {req.status === "rejected" && req.rejectionReason ? (
                            <span className="block text-xs text-red-500" title={req.rejectionReason}>
                              {req.rejectionReason}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Voting Debits */}
        <section aria-labelledby="debit-title" className="flex flex-col gap-5">
          <h2 id="debit-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Voting Debits
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
                  <span className="text-xl font-semibold md:w-[90px] md:text-right">
                    −{formatNumber(receipt.totalKobo)} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Historical Paystack Payments (if any exist) */}
      {historicalPayments.length > 0 ? (
        <div className="mt-12 px-5 md:px-6">
          <details className="cursor-pointer border-t border-border pt-4">
            <summary className="text-xl font-semibold text-muted hover:text-ink">
              Archived Card Payments ({historicalPayments.length})
            </summary>
            <ul className="mt-4 flex flex-col gap-3">
              {historicalPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-base">
                  <span>{p.reference} &middot; {formatDate(p.createdAt)}</span>
                  <span className="font-semibold">{formatNaira(p.amountKobo)} ({p.status})</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}

      {/* Payment Instructions Modal */}
      <Dialog open={activeRequest !== null} onClose={() => setActiveRequest(null)} title="OPay Transfer Instructions">
        {activeRequest ? (
          <div className="flex flex-col gap-5 text-ink">
            <div className="bg-ground p-4">
              <p className="text-base text-muted">Payment Destination</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-lg">
                <div>
                  <span className="block text-sm text-muted">Bank Name</span>
                  <span className="font-bold">{config.bankName}</span>
                </div>
                <div>
                  <span className="block text-sm text-muted">Account Number</span>
                  <span className="font-mono text-xl font-bold">{config.accountNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-sm text-muted">Account Name</span>
                  <span className="font-bold">{config.accountName}</span>
                </div>
              </div>
            </div>

            {/* Payment Reference */}
            <div className="rounded border-2 border-dashed border-gold bg-elevated p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold uppercase tracking-wider text-muted">
                    Payment Reference
                  </span>
                  <span className="font-mono text-2xl font-bold tracking-wide text-ink">
                    {activeRequest.reference}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyReference(activeRequest.reference)}
                  className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-on-color transition hover:opacity-90"
                >
                  {copied ? "Copied!" : "Copy Reference"}
                </button>
              </div>
              <p className="mt-2 text-sm text-muted leading-tight">
                <strong>Crucial:</strong> Enter this exact reference into your OPay transfer remark or narration so your payment is automatically matched to your account.
              </p>
            </div>

            {/* Summary */}
            <div className="flex justify-between border-y border-border py-3 text-lg font-medium">
              <span>Transfer Amount:</span>
              <span className="font-bold">₦{formatNumber(activeRequest.requestedAmountNaira)}</span>
            </div>
            <div className="flex justify-between pb-2 text-lg font-medium">
              <span>Points Credited Upon Approval:</span>
              <span className="font-bold text-mint">{activeRequest.expectedPoints} Points</span>
            </div>

            {activeRequest.status === "pending_verification" ? (
              <Notice tone="info">
                Your payment notification has been received. Your points will be credited within approximately 5 minutes after successful payment verification.
              </Notice>
            ) : null}

            {activeRequest.status === "approved" ? (
              <Notice tone="info">
                This payment has been approved and {activeRequest.creditedPoints ?? activeRequest.expectedPoints} points credited to your wallet!
              </Notice>
            ) : null}

            {activeRequest.status === "awaiting_payment" ? (
              <div className="flex flex-col gap-2 pt-2">
                <Button size="lg" full disabled={notifying} onClick={handleNotifyPayment}>
                  {notifying ? "Submitting notification\u2026" : "I've Made Payment"}
                </Button>
                <Button tone="ground" size="lg" full onClick={() => setActiveRequest(null)}>
                  I will pay later
                </Button>
              </div>
            ) : (
              <Button size="lg" full onClick={() => setActiveRequest(null)}>
                Close
              </Button>
            )}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
