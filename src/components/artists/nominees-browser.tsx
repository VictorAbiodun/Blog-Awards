"use client";

import { useCallback, useMemo, useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { EmptyState, ErrorBlock, FilterChip, NomineeGridSkeleton } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { useDebounce } from "@/hooks/use-debounce";
import { formatNumber, initials } from "@/lib/format";
import { api } from "@/services";

import { cardTones } from "./tones";

export function NomineesBrowser() {
  const load = useCallback(async () => {
    const [artists, categories, season] = await Promise.all([api.listArtists(), api.listCategories(), api.getSeason()]);
    return { artists, categories, season };
  }, []);
  const { state, reload } = useAsync(load);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [categoryId, setCategoryId] = useState("all");

  const visible = useMemo(() => {
    if (state.status !== "ready") return [];
    const needle = debouncedQuery.trim().toLowerCase();
    return state.data.artists.filter(
      (artist) =>
        (categoryId === "all" || artist.categoryIds.includes(categoryId)) && (needle === "" || artist.name.toLowerCase().includes(needle)),
    );
  }, [state, debouncedQuery, categoryId]);

  return (
    <div>
      <div className="flex flex-col gap-4 px-5 pb-6 md:px-6 md:pb-8">
        <label className="flex h-14 items-center gap-3 bg-elevated px-4 md:max-w-[560px]">
          <span className="text-lg font-semibold">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nominees by name"
            className="min-w-0 flex-1 bg-transparent text-xl text-ink placeholder:text-muted focus:outline-none"
          />
        </label>
        {state.status === "ready" ? (
          <div
            role="group"
            aria-label="Filter by category"
            className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none touch-pan-x"
          >
            <FilterChip selected={categoryId === "all"} onClick={() => setCategoryId("all")}>
              All ({state.data.artists.length})
            </FilterChip>
            {state.data.categories.map((category) => (
              <FilterChip key={category.id} selected={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                {category.name}
              </FilterChip>
            ))}
          </div>
        ) : null}
      </div>

      {state.status === "loading" ? <NomineeGridSkeleton count={8} /> : null}
      {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}

      {state.status === "ready" && visible.length === 0 ? (
        <div className="px-5 pb-24 md:px-6 md:pb-32">
          <EmptyState
            headline={state.data.artists.length === 0 ? "No Nominees Yet" : "No Matches Found"}
            description={
              state.data.artists.length === 0
                ? "Official nominees will appear here once the administrator adds and publishes them."
                : "No nominees matched your current search or category filter. Try clearing your filters."
            }
            action={
              state.data.artists.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategoryId("all");
                  }}
                  className="text-lg font-bold underline underline-offset-4 text-gold hover:text-ink"
                >
                  Clear search and filters
                </button>
              ) : null
            }
          />
        </div>
      ) : null}

      {state.status === "ready" && visible.length > 0 ? (
        <>
          <p aria-live="polite" className="sr-only">
            {visible.length} {visible.length === 1 ? "nominee" : "nominees"} shown
          </p>
          <ul className="grid grid-cols-1 gap-1.5 px-5 pb-24 md:grid-cols-2 md:gap-2 md:px-6 md:pb-32 lg:grid-cols-4">
            {visible.map((artist, index) => {
              const tone = cardTones[index % cardTones.length];
              const category = state.data.categories.find((c) => c.id === artist.categoryIds[0])?.name ?? "";
              return (
                <li key={artist.id} className={`flex items-center gap-3.5 p-3.5 text-on-color md:flex-col md:items-stretch md:gap-2.5 md:p-[22px] ${tone.panel}`}>
                  {artist.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- responsive CDN-hosted nominee photo
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      loading="lazy"
                      decoding="async"
                      className="size-14 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/10 md:size-[72px]"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`flex size-14 shrink-0 items-center justify-center bg-on-color font-display text-[28px] leading-none md:size-[72px] md:text-4xl ${tone.initials}`}
                    >
                      {initials(artist.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 md:mt-[70px]">
                    <h2 className="text-xl font-bold leading-[1.2] md:text-2xl">{artist.name}</h2>
                    <p className="text-base leading-[1.25] md:text-[19px]">{category}</p>
                    {state.data.season.showVoteCounts ? (
                      <p className="text-base font-semibold leading-[1.25] md:text-[19px]">{formatNumber(artist.votes)} votes</p>
                    ) : null}
                  </div>
                  <LinkButton href={`/nominees/${artist.slug}`} tone="black" size="sm" className="shrink-0 md:w-full md:py-3.5 md:text-[19px]" aria-label={`View and vote for ${artist.name}`}>
                    <span className="md:hidden">Vote</span>
                    <span className="hidden md:inline">View and vote</span>
                  </LinkButton>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
