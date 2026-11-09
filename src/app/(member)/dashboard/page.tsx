import type { Metadata } from "next";

import { DashboardView } from "@/components/member/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function DashboardPage() {
  return <DashboardView />;
}
