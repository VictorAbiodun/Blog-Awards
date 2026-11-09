"use client";

import Link from "next/link";
import { useCallback } from "react";

import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatNumber } from "@/lib/format";
import { api } from "@/services";
import type { LeaderboardRow } from "@/types/domain";

export function LeaderboardTable({ rows, showVotes, limit }: { rows: LeaderboardRow[]; showVotes: boolean; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <ol className="flex flex-col gap-[22px] md:gap-[26px]">
      {shown.map((row, index) => (
        <li key={row.artistId} className={index === 4 ? "mt-4" : undefined}>
          <Link href={`/nominees/${row.slug}`} className="group flex flex-col gap-1 md:grid md:grid-cols-[minmax(0,40%)_minmax(0,1fr)_auto] md:items-baseline md:gap-4">
            <span className="flex items-baseline justify-between gap-4 md:contents">
              <span className="text-base text-muted md:text-lg">{row.categoryName}</span>
              <span className="text-lg font-semibold md:order-3 md:text-lg">{showVotes ? formatNumber(row.votes) : "Hidden"}</span>
            </span>
            <span className="text-lg font-medium underline-offset-4 group-hover:underline">{row.name}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** A big statement, the current leader's total on a plate, and the standings. */
export function LeaderboardSection() {
  const load = useCallback(async () => {
    const [rows, season] = await Promise.all([api.getLeaderboard(), api.getSeason()]);
    return { rows, season };
  }, []);
  const { state, reload } = useAsync(load);

  return (
    <section aria-labelledby="leaders-title" className="px-5 py-20 md:px-6 md:py-40">
      <h2 id="leaders-title" className="font-display text-[clamp(56px,11.8vw,170px)] uppercase leading-[0.9] tracking-[-0.02em]">
        <span className="block md:pl-[43px]">Who is leading</span>
        <span className="block">this season</span>
      </h2>

      <div className="mt-10 md:mt-24">
        {state.status === "loading" ? <LoadingBlock label="Loading standings" /> : null}
        {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
        {state.status === "ready" && state.data.rows.length === 0 ? (
          <p className="text-xl">No standings yet. They appear once nominees are published and voting starts.</p>
        ) : null}
        {state.status === "ready" && state.data.rows.length > 0 ? (
          <div className="grid gap-10 md:grid-cols-12 md:items-end md:gap-x-6">
            <div className="order-2 ml-auto w-[60%] md:order-1 md:col-span-4 md:w-auto">
              <div className="flex aspect-[4/5] flex-col justify-between bg-elevated p-4 md:p-7">
                <p className="font-display text-[88px] leading-[0.85] tracking-[-0.02em] text-gold md:text-[clamp(120px,15vw,220px)]">
                  {state.data.season.showVoteCounts ? formatNumber(state.data.rows[0].votes) : "?"}
                </p>
                <p className="text-base leading-[1.4] md:text-xl">
                  {state.data.season.showVoteCounts
                    ? `${state.data.rows[0].name} leads ${state.data.rows[0].categoryName} in these standings.`
                    : "Vote totals stay hidden until voting closes."}
                </p>
              </div>
            </div>
            <div className="order-1 min-w-0 md:order-2 md:col-span-8 md:flex md:gap-6">
              <p className="mb-4 text-base text-muted md:mb-0 md:w-[94px] md:shrink-0">Leaderboard</p>
              <div className="min-w-0 md:flex-1">
                <LeaderboardTable rows={state.data.rows} showVotes={state.data.season.showVoteCounts} limit={8} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
