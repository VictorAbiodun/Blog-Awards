import type { Metadata } from "next";

import { AdminSeasonView } from "@/components/admin/season-view";

export const metadata: Metadata = { title: "Admin: Season and rules" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function Page() {
  return <AdminSeasonView />;
}
