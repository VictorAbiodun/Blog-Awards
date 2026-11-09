"use client";

import Link from "next/link";
import { useCallback } from "react";

import { cardTones } from "@/components/artists/tones";
import { LinkButton } from "@/components/ui/button";
import { Avatar, ErrorBlock, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatDate, formatNaira, formatNumber, formatSignedNaira, initials, pluralise } from "@/lib/format";
import { api } from "@/services";
import type { LedgerEntry } from "@/types/domain";

const ledgerStatus: Record<LedgerEntry["type"], string> = {
  top_up: "Verified",
  vote_debit: "Completed",
  refund: "Refunded",
  adjustment: "Adjusted",
};

export function DashboardView() {
  const load = useCallback(() => api.getDashboard(), []);
  const { state, reload } = useAsync(load);

  if (state.status === "loading") return <LoadingBlock label="Loading your dashboard" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;
  const d = state.data;
  const greeting = `HELLO, ${d.user.displayName.toUpperCase()}.`;

  return (
    <div className="pb-16 md:pb-24">
      <div className="flex flex-col gap-5 px-5 pb-6 pt-6 md:flex-row md:items-end md:justify-between md:px-6 md:pb-12 md:pt-12">
        <h1 style={{ "--chars": greeting.length } as React.CSSProperties} className="fit-greeting font-display uppercase leading-[0.88] tracking-[-0.02em]">
          {greeting}
        </h1>
        <div className="flex items-center gap-4 md:w-[459px]">
          <Avatar name={d.user.displayName} size={72} />
          <div>
            <p className="text-2xl font-semibold leading-[1.2]">{d.user.displayName}</p>
            <p className="text-lg text-muted">{d.user.email}</p>
            {d.user.emailConfirmed ? (
              <p className="text-lg font-semibold">Email verified</p>
            ) : (
              <Link href={`/check-email?email=${encodeURIComponent(d.user.email)}`} className="text-lg font-semibold underline underline-offset-4">
                Email not confirmed. Check your email
              </Link>
            )}
          </div>
        </div>
      </div>

      {!d.user.emailConfirmed ? (
        <div className="px-5 pb-6 md:px-6">
          <Notice>Confirm your email before you fund your wallet or vote.</Notice>
        </div>
      ) : null}

      <div className="grid gap-1.5 px-5 md:grid-cols-12 md:items-start md:gap-2 md:px-6">
        <div className="flex min-h-[270px] flex-col justify-between bg-mint p-5 text-on-color md:col-span-5 md:h-[420px] md:p-7">
          <div>
            <p className="text-xl font-medium md:text-[22px]">Available voting credits</p>
            <p className="font-display text-[140px] leading-[0.85] tracking-[-0.02em] md:text-[clamp(140px,14.6vw,210px)]">{formatNaira(d.balanceKobo)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <LinkButton href="/wallet" size="md">
              Add credits
            </LinkButton>
            <p className="text-lg">Credits are for voting only.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:contents">
          <div className="flex min-h-[210px] flex-col justify-between bg-elevated p-4 md:col-span-3 md:mt-[60px] md:h-[300px] md:p-7">
            <p className="font-display text-[110px] leading-[0.85] md:text-[clamp(110px,11.8vw,170px)]">{formatNumber(d.votesCast)}</p>
            <p className="text-lg leading-[1.3] md:text-[22px]">{d.votesCast === 1 ? "vote cast" : "votes cast"} this season</p>
          </div>
          <div className="mt-8 flex min-h-[230px] flex-col justify-between bg-grey p-4 text-on-color md:col-span-4 md:mt-[120px] md:h-[300px] md:p-7">
            <div>
              <p className="text-base font-medium md:text-xl">Current season</p>
              <p className="font-display text-[48px] uppercase leading-[0.9] md:text-[clamp(48px,5.8vw,84px)]">{d.season.name}</p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <p className="text-base leading-[1.3] md:text-xl">
                {d.season.votingStatus === "open" ? "Voting is open." : "Voting is closed."}
              </p>
              <LinkButton href="/nominees" tone="black" size="sm" className="md:px-6 md:py-3.5">
                Browse nominees
              </LinkButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-12 px-5 md:mt-24 md:grid-cols-2 md:gap-2 md:px-6">
        <section aria-labelledby="tx-title" className="flex flex-col gap-5">
          <h2 id="tx-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Recent wallet transactions
          </h2>
          {d.transactions.length === 0 ? (
            <p className="text-xl text-muted">No transactions yet. Add credits to get started.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {d.transactions.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 md:flex-nowrap">
                  <span className="text-lg text-muted md:w-[70px]">{formatDate(entry.createdAt)}</span>
                  <span className="min-w-0 flex-1 text-xl font-medium">{entry.description}</span>
                  <span className="text-lg md:w-[100px]">{ledgerStatus[entry.type]}</span>
                  <span className="text-xl font-semibold md:w-[100px] md:text-right">{formatSignedNaira(entry.amountKobo)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-title" className="flex flex-col gap-5">
          <h2 id="activity-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Voting activity
          </h2>
          {d.activity.length === 0 ? (
            <p className="text-xl text-muted">You have not voted yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {d.activity.map((receipt) => (
                <li key={receipt.id} className="flex flex-wrap items-baseline justify-between gap-x-4 md:flex-nowrap">
                  <Link href={`/receipts/${receipt.id}`} className="min-w-0 flex-1">
                    <span className="block text-xl font-medium underline-offset-4 hover:underline">{receipt.artistName}</span>
                    <span className="block text-base text-muted">{receipt.categoryName}</span>
                  </Link>
                  <span className="text-lg">
                    {pluralise(receipt.votes, "vote")} &middot; {formatNaira(receipt.totalKobo)}
                  </span>
                  <span className="text-lg text-muted md:w-[60px] md:text-right">{formatDate(receipt.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-16 grid gap-12 px-5 md:mt-24 md:grid-cols-2 md:gap-2 md:px-6">
        <section aria-labelledby="fav-title" className="flex flex-col gap-5">
          <h2 id="fav-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Favourite artists
          </h2>
          {d.favourites.length === 0 ? (
            <p className="text-xl text-muted">The artists you vote for most appear here.</p>
          ) : (
            <ul className="grid gap-1.5 md:grid-cols-3 md:gap-2">
              {d.favourites.map((artist, index) => {
                const tone = cardTones[index % cardTones.length];
                return (
                  <li key={artist.id}>
                    <Link href={`/nominees/${artist.slug}`} className={`flex items-center gap-3.5 p-3.5 text-on-color md:flex-col md:items-start md:gap-2.5 md:p-[18px] ${tone.panel}`}>
                      <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center bg-on-color font-display text-2xl leading-none md:size-12 ${tone.initials}`}>
                        {initials(artist.name)}
                      </span>
                      <span>
                        <span className="block text-xl font-bold leading-[1.2]">{artist.name}</span>
                        <span className="block text-base">{artist.categoryIds.length ? "Nominee" : ""}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="ann-title" className="flex flex-col gap-5">
          <h2 id="ann-title" className="text-[30px] font-bold leading-[1.1] md:text-4xl">
            Announcements
          </h2>
          {d.announcements.map((announcement) => (
            <p key={announcement.id} className="max-w-[560px] text-xl leading-[1.45]">
              {announcement.text}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
