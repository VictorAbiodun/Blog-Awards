"use client";

import { useCallback } from "react";

import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatDate, formatNumber } from "@/lib/format";
import { api } from "@/services";

import { LeaderboardTable } from "./leaderboard";

export function LeaderboardPage() {
  const load = useCallback(async () => {
    const [rows, season, winners] = await Promise.all([api.getLeaderboard(), api.getSeason(), api.listWinners()]);
    return { rows, season, winners };
  }, []);
  const { state, reload } = useAsync(load);

  if (state.status === "loading") return <LoadingBlock label="Loading standings" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;
  const { rows, season, winners } = state.data;

  return (
    <div className="px-5 pb-24 md:px-6 md:pb-32">
      <p className="mb-8 max-w-[640px] text-lg text-muted md:text-xl">
        {season.votingStatus === "open" ? `Voting is open for the ${season.name}.` : `Voting has closed for the ${season.name}.`}
        {season.showVoteCounts ? "" : " Vote totals stay hidden until voting closes."}
      </p>
      {rows.length === 0 ? (
        <p className="text-xl">No standings yet. They appear once nominees are published and voting starts.</p>
      ) : (
        <div className="md:max-w-[780px]">
          <LeaderboardTable rows={rows} showVotes={season.showVoteCounts} />
        </div>
      )}

      <section id="winners" aria-labelledby="winners-title" className="mt-20 scroll-mt-6 md:mt-32">
        <h2 id="winners-title" className="font-display text-[22vw] uppercase leading-[0.9] md:text-[min(10.4vw,9.4rem)]">
          Winners
        </h2>
        {winners.length === 0 ? (
          <p className="mt-4 max-w-[560px] text-xl">Winners will be listed here once the administrators publish the results after voting closes.</p>
        ) : (
          <ul className="mt-6 grid gap-1.5 md:grid-cols-2 md:gap-2">
            {winners.map((winner) => (
              <li key={winner.categoryId} className="bg-gold p-5 text-on-color md:p-7">
                <p className="text-lg">{winner.categoryName}</p>
                <p className="font-display text-[48px] uppercase leading-[0.95] md:text-[64px]">{winner.artistName}</p>
                <p className="text-lg font-semibold">
                  {formatNumber(winner.votes)} votes{winner.publishedAt ? ` \u00b7 published ${formatDate(winner.publishedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
