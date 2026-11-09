import type { Metadata } from "next";

import { AdminSuspiciousView } from "@/components/admin/payments-view";

export const metadata: Metadata = { title: "Admin: Suspicious activity" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function Page() {
  return <AdminSuspiciousView />;
}
