"use client";

import { useCallback, useState } from "react";

import { BallotStub } from "@/components/artists/ballot-stub";
import { LinkButton } from "@/components/ui/button";
import { ErrorBlock, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { formatNaira } from "@/lib/format";
import { SAMPLE_VOTE_PRICE_KOBO } from "@/lib/constants";
import { api } from "@/services";

/** A ballot stub on a dark plate, with tabs to switch between nominees. */
export function Showcase() {
  const load = useCallback(async () => {
    const [artists, categories] = await Promise.all([api.listArtists(), api.listCategories()]);
    return { artists: artists.slice(0, 3), categories };
  }, []);
  const { state, reload } = useAsync(load);
  const [index, setIndex] = useState(0);

  if (state.status === "loading") return <LoadingBlock label="Loading nominees" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const { artists, categories } = state.data;
  if (artists.length === 0) {
    return (
      <section aria-labelledby="showcase-title" className="bg-surface px-5 py-16 md:px-6 md:py-24">
        <h2 id="showcase-title" className="font-display text-[56px] uppercase leading-[0.9] md:text-[96px]">
          Nominees are coming.
        </h2>
        <p className="mt-4 max-w-[560px] text-xl">Approved artists appear here once the administrator publishes them.</p>
      </section>
    );
  }

  const artist = artists[Math.min(index, artists.length - 1)];
  const category = categories.find((item) => item.id === artist.categoryIds[0])?.name ?? "Nominee";

  return (
    <section aria-labelledby="showcase-title" className="bg-surface md:grid md:min-h-[880px] md:grid-cols-2">
      <h2 id="showcase-title" className="sr-only">
        Featured nominees
      </h2>
      <div className="p-5 md:flex md:items-center md:p-10">
        <div className="flex aspect-square w-full items-center justify-center bg-elevated p-[8%]">
          <BallotStub name={artist.name} category={category} price={formatNaira(SAMPLE_VOTE_PRICE_KOBO)} />
        </div>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-12 md:justify-between md:gap-10 md:p-10 md:pt-[60px]">
        <div role="tablist" aria-label="Featured nominees" className="flex flex-wrap gap-x-5 gap-y-2 md:gap-x-8">
          {artists.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={`text-xl md:text-[22px] ${i === index ? "font-bold underline underline-offset-4" : "font-medium text-muted"}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="flex flex-col gap-5">
          <h3 className="font-display text-[64px] uppercase leading-[0.9] tracking-[-0.01em] md:text-[clamp(72px,9vw,130px)]">{category}</h3>
          <p className="max-w-[420px] text-lg leading-[1.5] md:text-xl">{artist.bio}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <LinkButton href={`/nominees/${artist.slug}#vote`} tone="mint" size="lg" full>
            Vote for {formatNaira(SAMPLE_VOTE_PRICE_KOBO)}
          </LinkButton>
          <LinkButton href={`/nominees/${artist.slug}`} tone="ground" size="lg" full>
            View profile
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
