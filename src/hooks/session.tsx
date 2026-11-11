"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { isDemoMode } from "@/lib/demo-mode";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { api } from "@/services";
import { DEMO_CHANGE_EVENT } from "@/services/demo/store";
import type { Session, User } from "@/types/domain";

export type SessionState = { status: "loading" } | Session;

interface SessionContextValue {
  session: SessionState;
  /** True right after the person chose to log out, so guards do not bounce them to the login page. */
  justSignedOut: boolean;
  /** Re-read the session, for example after logging in or out. */
  refresh: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [justSignedOut, setJustSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getSession().then(
      (value) => {
        if (cancelled) return;
        setSession(value);
        if (value.status === "signedIn") setJustSignedOut(false);
      },
      () => {
        if (!cancelled) setSession({ status: "signedOut" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    window.addEventListener(DEMO_CHANGE_EVENT, bump);
    window.addEventListener("focus", bump);

    let unsubscribe: (() => void) | undefined;
    if (!isDemoMode) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            setTick((value) => value + 1);
          } else if (event === "SIGNED_OUT") {
            setSession({ status: "signedOut" });
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
      } catch {
        // Safe fallback for test or mock environments
      }
    }

    return () => {
      window.removeEventListener(DEMO_CHANGE_EVENT, bump);
      window.removeEventListener("focus", bump);
      unsubscribe?.();
    };
  }, []);

  const refresh = useCallback(() => setTick((value) => value + 1), []);
  const signOut = useCallback(async () => {
    setJustSignedOut(true);
    await api.logout();
    setSession({ status: "signedOut" });
    setTick((value) => value + 1);
  }, []);

  const value = useMemo(() => ({ session, justSignedOut, refresh, signOut }), [session, justSignedOut, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>.");
  return value;
}

/** The signed-in user, or null while loading or signed out. */
export function useUser(): User | null {
  const { session } = useSession();
  return session.status === "signedIn" ? session.user : null;
}
