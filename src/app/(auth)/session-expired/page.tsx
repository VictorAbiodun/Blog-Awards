import type { Metadata } from "next";

import { AuthSplit } from "@/components/layout/auth-split";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Session expired" };

export default function SessionExpiredPage() {
  return (
    <AuthSplit tone="orange" headline={"SESSION\nEXPIRED."} sentence="For your security you were logged out. Nothing was lost: your wallet and votes are safe." title="Please log in again">
      <p className="text-xl leading-[1.45]">Your session ended, so we signed you out. Log in again to carry on where you stopped.</p>
      <LinkButton href="/login" size="lg" full>
        Log in
      </LinkButton>
      <LinkButton href="/" tone="elevated" size="lg" full>
        Back to home
      </LinkButton>
    </AuthSplit>
  );
}
