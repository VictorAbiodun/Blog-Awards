"use client";

import Link from "next/link";
import { useCallback } from "react";

import { BallotStub } from "@/components/artists/ballot-stub";
import { LinkButton } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatNumber } from "@/lib/format";
import { api } from "@/services";

import { VotePanel } from "./vote-panel";

export function NomineeView({ slug }: { slug: string }) {
  const load = useCallback(async () => {
    const [artist, categories, season] = await Promise.all([api.getArtist(slug), api.listCategories(), api.getSeason()]);
    return { artist, categories, season };
  }, [slug]);
  const { state, reload, refresh } = useAsync(load);

  if (state.status === "loading") return <LoadingBlock label="Loading nominee" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const { artist, categories, season } = state.data;
  if (!artist) {
    return (
      <div className="flex flex-col items-start gap-5 px-5 py-16 md:px-6">
        <h1 className="font-display text-[64px] uppercase leading-[0.9] md:text-[120px]">Nominee not found.</h1>
        <p className="text-xl">That artist is not published, or the link is wrong.</p>
        <LinkButton href="/nominees">See all nominees</LinkButton>
      </div>
    );
  }

  const categoryName = categories.find((c) => c.id === artist.categoryIds[0])?.name ?? "Nominee";
  const [first, ...rest] = artist.name.split(" ");

  return (
    <div className="px-5 pb-24 pt-5 md:px-6 md:pt-6">
      <Link href="/nominees" className="text-lg font-semibold underline underline-offset-4 md:text-xl">
        &larr; All nominees
      </Link>

      <div className="mt-5 grid gap-6 md:mt-6 md:grid-cols-2 md:items-start">
        <div className="flex aspect-square w-full items-center justify-center bg-elevated p-[8%]">
          {artist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- administrator-supplied image of unknown size
            <img src={artist.imageUrl} alt={`${artist.name}`} className="size-full object-cover" />
          ) : (
            <BallotStub name={artist.name} category={categoryName} price="1 Point (₦50)" />
          )}
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-xl font-medium text-muted md:text-2xl">{categoryName}</p>
          <h1 className="font-display text-[26vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(10.4vw,9.4rem)]">
            {first}
            {rest.length ? <br /> : null}
            {rest.join(" ")}
          </h1>
          <p className="max-w-[560px] text-lg leading-[1.5] md:text-xl">{artist.bio}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xl font-semibold">
            {artist.musicUrl ? (
              <a href={artist.musicUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Listen to the music
              </a>
            ) : null}
            {artist.socialUrl ? (
              <a href={artist.socialUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Social profile
              </a>
            ) : null}
          </div>
          {season.showVoteCounts ? (
            <p className="text-lg font-medium md:text-xl">Current votes: {formatNumber(artist.votes)} (shown under the season&rsquo;s publication rules)</p>
          ) : null}
          <VotePanel artist={artist} categoryName={categoryName} season={season} onSeasonChange={refresh} />
        </div>
      </div>
    </div>
  );
}
