import type { Metadata } from "next";

import { AdminArtistsView } from "@/components/admin/artists-view";

export const metadata: Metadata = { title: "Admin: Artists" };

// These pages render behind the login guard, so there is nothing to prefetch ahead of time.
export const instant = false;

export default function Page() {
  return <AdminArtistsView />;
}
