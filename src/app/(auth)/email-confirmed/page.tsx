import type { Metadata } from "next";
import { Suspense } from "react";

import { ConfirmedActions } from "@/components/auth/confirmed-actions";
import { AuthSplit } from "@/components/layout/auth-split";

export const metadata: Metadata = { title: "Email confirmed" };

export default function EmailConfirmedPage() {
  return (
    <AuthSplit tone="gold" headline={"EMAIL\nCONFIRMED."} sentence="Your account is ready. You can now fund your wallet and vote for the artists you back." title="You are all set">
      <Suspense fallback={<p className="text-xl text-muted animate-pulse">Setting up your verified session&hellip;</p>}>
        <ConfirmedActions />
      </Suspense>
    </AuthSplit>
  );
}
