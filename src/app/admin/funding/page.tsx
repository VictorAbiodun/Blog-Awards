import type { Metadata } from "next";

import { AdminFundingView } from "@/components/admin/funding-view";

export const metadata: Metadata = { title: "Admin: Wallet Funding Management" };

export const instant = false;

export default function Page() {
  return <AdminFundingView />;
}
