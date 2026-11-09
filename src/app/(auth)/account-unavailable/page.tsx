import type { Metadata } from "next";

import { AuthSplit } from "@/components/layout/auth-split";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account unavailable" };

export default function AccountUnavailablePage() {
  return (
    <AuthSplit tone="grey" headline={"ACCOUNT\nUNAVAILABLE."} sentence="We could not open this account. It may be disabled or deleted." title="We can’t open this account">
      <p className="text-xl leading-[1.45]">This account is disabled or has been deleted. If you think that is a mistake, contact us and we will look into it.</p>
      <LinkButton href="/contact?subject=account" size="lg" full>
        Contact us
      </LinkButton>
      <LinkButton href="/" tone="elevated" size="lg" full>
        Back to home
      </LinkButton>
    </AuthSplit>
  );
}
