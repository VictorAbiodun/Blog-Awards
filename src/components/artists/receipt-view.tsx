"use client";

import { useCallback } from "react";

import { LinkButton } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime, formatNaira } from "@/lib/format";
import { api } from "@/services";

export function ReceiptView({ id }: { id: string }) {
  const load = useCallback(() => api.getReceipt(id), [id]);
  const { state, reload } = useAsync(load);

  if (state.status === "loading") return <LoadingBlock label="Loading your receipt" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;
  const receipt = state.data;

  const rows: Array<[string, string]> = [
    ["Artist", receipt.artistName],
    ["Category", receipt.categoryName],
    ["Votes", String(receipt.votes)],
    ["Price", `${formatNaira(receipt.priceKobo)} each`],
    ["Total", formatNaira(receipt.totalKobo)],
    ["Wallet after", formatNaira(receipt.balanceAfterKobo)],
    ["Receipt no.", receipt.receiptNo],
    ["Date", formatDateTime(receipt.createdAt)],
  ];

  return (
    <div className="grid gap-8 px-5 pb-16 pt-6 md:grid-cols-2 md:items-center md:gap-10 md:px-6 md:pb-24 md:pt-10">
      <div className="flex flex-col gap-8">
        <h1 role="status" className="font-display text-[24vw] uppercase leading-[0.86] tracking-[-0.02em] md:text-[min(14.6vw,13.1rem)]">
          Vote
          <br />
          recorded.
        </h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <LinkButton href="/nominees" size="lg" full className="sm:w-auto sm:min-w-[300px]">
            Back to nominees
          </LinkButton>
          <LinkButton href="/wallet" tone="elevated" size="lg" full className="sm:w-auto sm:min-w-[240px]">
            View wallet
          </LinkButton>
        </div>
      </div>

      <section aria-labelledby="receipt-title" className="relative bg-ink p-5 text-on-color md:p-9">
        <h2 id="receipt-title" className="font-display text-[40px] uppercase leading-none md:text-[64px]">
          Vote receipt
        </h2>
        <dl className="mt-4 flex flex-col gap-2.5 md:mt-5 md:gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-lg leading-[1.3] md:text-[22px]">
              <dt>{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <span aria-hidden="true" className="absolute -left-4 top-1/2 size-8 rounded-full bg-ground md:-left-[22px] md:size-11" />
        <span aria-hidden="true" className="absolute -right-4 top-1/2 size-8 rounded-full bg-ground md:-right-[22px] md:size-11" />
      </section>
    </div>
  );
}
