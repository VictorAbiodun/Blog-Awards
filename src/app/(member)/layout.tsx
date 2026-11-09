import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { RequireAuth } from "@/components/layout/require-auth";
import { LoadingBlock } from "@/components/ui/feedback";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    // The guard reads the current path, which is only known at request time.
    <Suspense fallback={<LoadingBlock label="Checking your account" />}>
      <RequireAuth>
        <AppHeader />
        <main id="main" className="pb-24 md:pb-0">
          {children}
        </main>
      </RequireAuth>
    </Suspense>
  );
}
