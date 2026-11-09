import { Suspense } from "react";

import { AdminShell } from "@/components/layout/admin-shell";
import { RequireAuth } from "@/components/layout/require-auth";
import { LoadingBlock } from "@/components/ui/feedback";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingBlock label="Checking your account" />}>
      <RequireAuth admin>
        <AdminShell>{children}</AdminShell>
      </RequireAuth>
    </Suspense>
  );
}
