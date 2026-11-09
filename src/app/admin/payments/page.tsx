import type { Metadata } from "next";

import { AdminPaymentsView } from "@/components/admin/payments-view";

export const metadata: Metadata = { title: "Admin: Payments" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function Page() {
  return <AdminPaymentsView />;
}
