"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button, LinkButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ChoiceTile, ErrorBlock, LoadingBlock, Notice, StatusPanel } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { useSession } from "@/hooks/session";
import { useAsync } from "@/hooks/use-async";
import { VOTE_COUNT_CHOICES } from "@/lib/constants";
import { errorMessage } from "@/lib/error-message";
import { formatNumber } from "@/lib/format";
import { api, ApiError } from "@/services";
import type { Artist, Season } from "@/types/domain";

function Line({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-lg leading-[1.3] md:text-xl">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/**
 * Everything a fan sees where they cast votes: log in, confirm email, voting
 * closed, choosing votes, not enough credits, the confirm dialog and errors.
 */
export function VotePanel({ artist, categoryName, season, onSeasonChange }: { artist: Artist; categoryName: string; season: Season; onSeasonChange: () => void }) {
  const { session, refresh } = useSession();
  const router = useRouter();
  const next = encodeURIComponent(`/nominees/${artist.slug}`);

  if (session.status === "loading") return <LoadingBlock label="Checking your account" />;

  if (session.status === "signedOut" || session.status === "expired") {
    return (
      <StatusPanel
        tone="mint"
        headline="Log in to vote."
        actions={
          <>
            <LinkButton href={`/login?next=${next}`} size="lg" full>
              Log in
            </LinkButton>
            <LinkButton href="/register" tone="elevated" size="lg" full>
              Create an account
            </LinkButton>
          </>
        }
      >
        You need a free account to fund a wallet and vote. It only takes a name, an email and a password.
      </StatusPanel>
    );
  }

  if (session.status === "unavailable") {
    return (
      <StatusPanel tone="grey" headline="Account unavailable." actions={<LinkButton href="/contact?subject=account" size="lg" full>Contact us</LinkButton>}>
        This account is disabled or has been deleted. Contact us if you think that is a mistake.
      </StatusPanel>
    );
  }

  if (!session.user.emailConfirmed) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice>Confirm your email before you vote. We sent you a link when you signed up.</Notice>
        <LinkButton href={`/check-email?email=${encodeURIComponent(session.user.email)}`} size="lg">
          Check my email
        </LinkButton>
      </div>
    );
  }

  if (season.votingStatus !== "open") {
    return (
      <StatusPanel
        tone="grey"
        headline="Voting is closed."
        actions={
          <>
            <LinkButton href="/leaderboard" size="lg" full>
              See leaderboard
            </LinkButton>
            <LinkButton href="/nominees" tone="elevated" size="lg" full>
              Browse nominees
            </LinkButton>
          </>
        }
      >
        Voting for the {season.name} has ended. You can still browse the nominees and see the leaderboard.
      </StatusPanel>
    );
  }

  return <CastPanel artist={artist} categoryName={categoryName} season={season} onSeasonChange={onSeasonChange} onSignedOut={refresh} onDone={(id) => router.push(`/receipts/${id}`)} />;
}

function CastPanel({
  artist,
  categoryName,
  season: _season,
  onSeasonChange,
  onSignedOut,
  onDone,
}: {
  artist: Artist;
  categoryName: string;
  season: Season;
  onSeasonChange: () => void;
  onSignedOut: () => void;
  onDone: (receiptId: string) => void;
}) {
  const loadWallet = useCallback(() => api.getWallet(), []);
  const { state, reload, refresh } = useAsync(loadWallet);
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [votes, setVotes] = useState<number>(3);
  const [customText, setCustomText] = useState<string>("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingBlock label="Loading your wallet" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const balance = state.data.balancePoints ?? state.data.balanceKobo;

  function handleCustomInput(raw: string) {
    setCustomText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setCustomError("Enter the number of votes you want to cast.");
      return;
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num)) {
      setCustomError("Please enter a whole number of votes.");
      return;
    }
    if (num < 1) {
      setCustomError("Choose at least 1 vote.");
      return;
    }
    if (num > 100) {
      setCustomError("You can cast at most 100 votes at a time.");
      return;
    }
    setCustomError(null);
    setVotes(num);
  }

  function selectPreset(n: number) {
    setMode("preset");
    setVotes(n);
    setCustomText("");
    setCustomError(null);
  }

  function selectCustom() {
    setMode("custom");
    if (!customText) {
      setCustomText(String(votes));
      handleCustomInput(String(votes));
    }
  }

  const hasInvalidCustom = mode === "custom" && customError !== null;
  const effectiveVotes = hasInvalidCustom ? 0 : votes;
  const pointsCost = effectiveVotes; // 1 vote = 1 point
  const enough = balance >= pointsCost && effectiveVotes > 0;
  const maxAffordableVotes = Math.min(100, Math.max(0, balance));
  const affordablePreset = [...VOTE_COUNT_CHOICES].reverse().find((n) => n <= balance);

  function chooseFewerVotes() {
    if (affordablePreset) {
      selectPreset(affordablePreset);
    } else if (maxAffordableVotes > 0) {
      setMode("custom");
      setVotes(maxAffordableVotes);
      setCustomText(String(maxAffordableVotes));
      setCustomError(null);
    }
  }

  function chooseMaxAffordable() {
    if (maxAffordableVotes > 0) {
      setMode("custom");
      setVotes(maxAffordableVotes);
      setCustomText(String(maxAffordableVotes));
      setCustomError(null);
    }
  }

  async function confirm() {
    if (!enough || effectiveVotes <= 0) return;
    setBusy(true);
    setProblem(null);
    try {
      const receipt = await api.castVotes({ artistSlug: artist.slug, votes: effectiveVotes });
      setConfirming(false);
      onDone(receipt.id);
    } catch (error) {
      if (error instanceof ApiError && error.code === "insufficient_credits") {
        setConfirming(false);
        refresh();
      } else if (error instanceof ApiError && error.code === "voting_closed") {
        setConfirming(false);
        onSeasonChange();
      } else if (error instanceof ApiError && error.code === "not_signed_in") {
        setConfirming(false);
        onSignedOut();
      } else {
        setProblem(errorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="vote" className="scroll-mt-6 flex flex-col gap-5 bg-elevated p-5 md:p-7">
      <h2 className="text-[28px] font-bold leading-[1.1] md:text-[32px]">Cast your votes</h2>

      <div role="group" aria-label="Number of votes" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {VOTE_COUNT_CHOICES.map((n) => (
          <ChoiceTile
            key={n}
            selected={mode === "preset" && votes === n}
            onClick={() => selectPreset(n)}
            sub={n === 1 ? "vote" : "votes"}
          >
            {n}
          </ChoiceTile>
        ))}
        <button
          type="button"
          aria-pressed={mode === "custom"}
          onClick={selectCustom}
          className={`flex min-h-20 flex-col items-center justify-center p-2 text-center transition-colors md:min-h-24 ${
            mode === "custom" ? "bg-gold text-on-color" : "bg-ground text-ink"
          }`}
        >
          <span className="font-display text-2xl font-bold leading-none md:text-3xl">Custom</span>
          <span className="text-xs font-semibold text-muted">
            {mode === "custom" ? "selected" : "enter any"}
          </span>
        </button>
      </div>

      <Field
        tone="ground"
        label="Custom number of votes"
        inputMode="numeric"
        type="number"
        min={1}
        max={100}
        step={1}
        placeholder="Enter number of votes (1 to 100)"
        value={customText}
        onFocus={selectCustom}
        onChange={(event) => {
          setMode("custom");
          handleCustomInput(event.target.value);
        }}
        error={mode === "custom" && customError ? customError : undefined}
        hint="Cast between 1 and 100 votes per transaction. Cost is 1 Point (₦50) per vote."
      />

      <div className="flex flex-col gap-2">
        {effectiveVotes > 0 ? (
          <Line
            label={`${effectiveVotes} ${effectiveVotes === 1 ? "vote" : "votes"} \u00d7 1 pt`}
            value={`${pointsCost} ${pointsCost === 1 ? "Point" : "Points"}`}
          />
        ) : (
          <Line label="Cost per vote" value="1 Point (₦50)" />
        )}
        <Line label="Wallet points balance" value={`${formatNumber(balance)} ${balance === 1 ? "Point" : "Points"}`} muted />
        {enough ? <Line label="Balance after voting" value={`${formatNumber(balance - pointsCost)} ${balance - pointsCost === 1 ? "Point" : "Points"}`} /> : null}
      </div>

      {hasInvalidCustom ? (
        <Button size="lg" full disabled>
          Enter valid number of votes
        </Button>
      ) : !enough ? (
        <StatusPanel
          tone="orange"
          headline="Not enough points."
          actions={
            <>
              <LinkButton href="/wallet" size="md" full>
                Fund points
              </LinkButton>
              {affordablePreset || maxAffordableVotes > 0 ? (
                <Button tone="ground" full onClick={chooseFewerVotes}>
                  Choose fewer votes
                </Button>
              ) : null}
              {maxAffordableVotes > 0 && maxAffordableVotes !== (affordablePreset ?? 0) ? (
                <Button tone="elevated" full onClick={chooseMaxAffordable}>
                  Use max affordable ({maxAffordableVotes} {maxAffordableVotes === 1 ? "vote" : "votes"})
                </Button>
              ) : null}
            </>
          }
        >
          You need {pointsCost} {pointsCost === 1 ? "point" : "points"} for {effectiveVotes} {effectiveVotes === 1 ? "vote" : "votes"} but your wallet only has {formatNumber(balance)} {balance === 1 ? "point" : "points"}.
          {maxAffordableVotes > 0 ? " Choose a number that tallies with your balance, or fund your wallet." : " Please fund your wallet to continue."}
        </StatusPanel>
      ) : (
        <Button size="lg" full onClick={() => setConfirming(true)}>
          Vote with {pointsCost} {pointsCost === 1 ? "Point" : "Points"}
        </Button>
      )}

      <p className="text-base leading-[1.4] text-muted">
        Votes are final once confirmed. Points are deducted immediately from your wallet, and you can only vote while voting is open.
      </p>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Confirm your vote">
        <div className="flex flex-col gap-2.5">
          <Line label="Artist" value={artist.name} />
          <Line label="Category" value={categoryName} />
          <Line label="Votes to cast" value={`${effectiveVotes} ${effectiveVotes === 1 ? "vote" : "votes"}`} />
          <Line label="Points to deduct" value={`${pointsCost} ${pointsCost === 1 ? "Point" : "Points"}`} />
          <Line label="Balance after voting" value={`${formatNumber(balance - pointsCost)} ${balance - pointsCost === 1 ? "Point" : "Points"}`} />
        </div>
        {problem ? <Notice>{problem}</Notice> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" full disabled={busy} onClick={confirm}>
            {busy ? "Voting\u2026" : "Confirm and vote"}
          </Button>
          <Button tone="ground" size="lg" full disabled={busy} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
        <p className="text-base leading-[1.4] text-muted">Votes are final once confirmed. Voting only works while the season is open.</p>
      </Dialog>
    </div>
  );
}
