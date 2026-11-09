"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button, LinkButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ChoiceTile, ErrorBlock, LoadingBlock, Notice, StatusPanel } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";
import { useAsync } from "@/hooks/use-async";
import { VOTE_COUNT_CHOICES } from "@/lib/constants";
import { errorMessage } from "@/lib/error-message";
import { formatNaira } from "@/lib/format";
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
  season,
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
  const [votes, setVotes] = useState<number>(3);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (state.status === "loading") return <LoadingBlock label="Loading your wallet" />;
  if (state.status === "error") return <ErrorBlock error={state.error} onRetry={reload} />;

  const balance = state.data.balanceKobo;
  const total = votes * season.votePriceKobo;
  const enough = balance >= total;
  const affordable = [...VOTE_COUNT_CHOICES].reverse().find((n) => n * season.votePriceKobo <= balance);

  async function confirm() {
    setBusy(true);
    setProblem(null);
    try {
      const receipt = await api.castVotes({ artistSlug: artist.slug, votes });
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

      <div role="group" aria-label="Number of votes" className="grid grid-cols-4 gap-2">
        {VOTE_COUNT_CHOICES.map((n) => (
          <ChoiceTile key={n} selected={votes === n} onClick={() => setVotes(n)} sub={n === 1 ? "vote" : "votes"}>
            {n}
          </ChoiceTile>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Line label={`${votes} ${votes === 1 ? "vote" : "votes"} \u00d7 ${formatNaira(season.votePriceKobo)}`} value={formatNaira(total)} />
        <Line label="Wallet balance now" value={formatNaira(balance)} muted />
        {enough ? <Line label="Balance after voting" value={formatNaira(balance - total)} /> : null}
      </div>

      {!enough ? (
        <StatusPanel
          tone="orange"
          headline="Not enough credits."
          actions={
            <>
              <LinkButton href="/wallet" size="md" full>
                Add credits
              </LinkButton>
              {affordable ? (
                <Button tone="ground" full onClick={() => setVotes(affordable)}>
                  Choose fewer votes
                </Button>
              ) : null}
            </>
          }
        >
          You need {formatNaira(total)} for {votes} {votes === 1 ? "vote" : "votes"} but your wallet has {formatNaira(balance)}. Add {formatNaira(total - balance)} or more
          {affordable ? ", or choose fewer votes" : ""}.
        </StatusPanel>
      ) : (
        <Button size="lg" full onClick={() => setConfirming(true)}>
          Vote for {formatNaira(total)}
        </Button>
      )}

      <p className="text-base leading-[1.4] text-muted">
        Votes are final once confirmed. The cost is taken from your wallet, and you can only vote while voting is open.
      </p>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Confirm your vote">
        <div className="flex flex-col gap-2.5">
          <Line label="Artist" value={artist.name} />
          <Line label="Category" value={categoryName} />
          <Line label={`${votes} ${votes === 1 ? "vote" : "votes"} \u00d7 ${formatNaira(season.votePriceKobo)}`} value={formatNaira(total)} />
          <Line label="Balance after voting" value={formatNaira(balance - total)} />
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
