import type { Metadata } from "next";

import { AdminWinnersView } from "@/components/admin/winners-view";

export const metadata: Metadata = { title: "Admin: Winners and reports" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function Page() {
  return <AdminWinnersView />;
}
