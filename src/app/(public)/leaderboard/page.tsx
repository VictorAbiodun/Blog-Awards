import type { Metadata } from "next";

import { LeaderboardPage } from "@/components/home/leaderboard-page";

export const metadata: Metadata = { title: "Leaderboard" };

export default function Page() {
  return (
    <main id="main">
      <div className="px-5 pb-6 pt-6 md:px-6 md:pb-10 md:pt-10">
        <h1 className="font-display text-[20vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(13.9vw,13rem)]">Leaderboard</h1>
      </div>
      <LeaderboardPage />
    </main>
  );
}
