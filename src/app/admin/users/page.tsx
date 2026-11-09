import type { Metadata } from "next";

import { AdminUsersView } from "@/components/admin/users-view";

export const metadata: Metadata = { title: "Admin: Admins & Roles Management" };

export const instant = false;

export default function Page() {
  return <AdminUsersView />;
}
