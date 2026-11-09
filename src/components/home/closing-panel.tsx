"use client";

import { LinkButton } from "@/components/ui/button";
import { useSession } from "@/hooks/session";

/** The idea again, one more time, with the main button. */
export function ClosingPanel() {
  const { session } = useSession();
  const signedIn = session.status === "signedIn";
  return (
    <section aria-labelledby="closing-title" className="flex min-h-[675px] flex-col justify-between gap-10 bg-surface px-5 pb-10 pt-8 md:min-h-[810px] md:px-6 md:pt-14">
      <h2
        id="closing-title"
        style={{ "--chars": 15.5 } as React.CSSProperties}
        className="fit-wide font-display uppercase leading-[0.9] tracking-[-0.02em]"
      >
        Your vote.
        <br />
        Their break.
      </h2>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="max-w-[575px] text-xl leading-[1.3] md:text-[22px]">Create a free account, fund your wallet and back an artist.</p>
        <LinkButton href={signedIn ? "/nominees" : "/register"} size="lg" full className="md:w-[342px]">
          {signedIn ? "Browse nominees" : "Start voting"}
        </LinkButton>
      </div>
    </section>
  );
}
