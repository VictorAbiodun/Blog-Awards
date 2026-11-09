import type { Metadata } from "next";
import { Suspense } from "react";

import { WalletView } from "@/components/member/wallet-view";
import { LoadingBlock } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Wallet" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function WalletPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading your wallet" />}>
      <WalletView />
    </Suspense>
  );
}
