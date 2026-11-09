import type { Metadata } from "next";

import { AdminAuditView } from "@/components/admin/audit-view";

export const metadata: Metadata = { title: "Admin: Audit log" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function Page() {
  return <AdminAuditView />;
}
