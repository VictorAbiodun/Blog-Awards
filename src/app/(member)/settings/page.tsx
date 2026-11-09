import type { Metadata } from "next";

import { SettingsView } from "@/components/member/settings-view";

export const metadata: Metadata = { title: "Account settings" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function SettingsPage() {
  return <SettingsView />;
}
