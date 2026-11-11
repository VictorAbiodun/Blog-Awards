"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { useSession } from "@/hooks/session";
import { isDemoMode } from "@/lib/demo-mode";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ConfirmedActions() {
  const { session, refresh } = useSession();
  const [checkingHash, setCheckingHash] = useState<boolean>(() => {
    if (typeof window !== "undefined" && Boolean(window.location.hash)) return true;
    return false;
  });

  useEffect(() => {
    let active = true;
    if (!isDemoMode && typeof window !== "undefined" && Boolean(window.location.hash)) {
      try {
        const supabase = createSupabaseBrowserClient();
        supabase.auth.getSession().then(
          ({ data }) => {
            if (!active) return;
            if (data.session) {
              refresh();
            }
            setCheckingHash(false);
          },
          () => {
            if (!active) return;
            setCheckingHash(false);
          },
        );
      } catch {
        // Safe fallback
      }
    }
    return () => {
      active = false;
    };
  }, [refresh]);

  const isLoading = session.status === "loading" || checkingHash;
  const signedIn = session.status === "signedIn";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xl leading-[1.45] text-muted animate-pulse">
          Setting up your verified session&hellip;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xl leading-[1.45]">
        {signedIn ? (
          <>
            Welcome, <strong>{session.user.displayName}</strong>! Your email has been verified and you are now signed in. Fund your wallet with points or explore the nominees to vote.
          </>
        ) : (
          "Your email is confirmed. Sign in to your account to fund your wallet and start voting."
        )}
      </p>

      {signedIn ? (
        <>
          <LinkButton href="/wallet" size="lg" full>
            Fund wallet with points
          </LinkButton>
          <LinkButton href="/nominees" tone="elevated" size="lg" full>
            Browse nominees & vote
          </LinkButton>
          <LinkButton href="/dashboard" tone="ground" size="md" full>
            Go to my dashboard
          </LinkButton>
        </>
      ) : (
        <>
          <LinkButton href="/login" size="lg" full>
            Log in to continue
          </LinkButton>
          <LinkButton href="/nominees" tone="elevated" size="lg" full>
            Browse nominees
          </LinkButton>
        </>
      )}
    </div>
  );
}
