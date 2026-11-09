"use client";

import { LinkButton } from "@/components/ui/button";
import { useSession } from "@/hooks/session";

export function ConfirmedActions() {
  const { session } = useSession();
  const signedIn = session.status === "signedIn";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xl leading-[1.45]">Your email is confirmed. Next, {signedIn ? "add credits to your wallet or browse the nominees." : "log in, then add credits to your wallet or browse the nominees."}</p>
      <LinkButton href={signedIn ? "/dashboard" : "/login"} size="lg" full>
        {signedIn ? "Go to dashboard" : "Log in"}
      </LinkButton>
      <LinkButton href="/nominees" tone="elevated" size="lg" full>
        Browse nominees
      </LinkButton>
    </div>
  );
}
