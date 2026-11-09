import type { Metadata } from "next";

import { AdminOverviewView } from "@/components/admin/overview";

export const metadata: Metadata = { title: "Admin: Overview" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function AdminHomePage() {
  return <AdminOverviewView />;
}
