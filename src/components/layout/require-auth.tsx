"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingBlock } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";

/**
 * Keeps signed-out visitors out of signed-in pages and sends them somewhere
 * helpful. This is a convenience for the interface only. The backend must still
 * check permission on every request: hiding a page is never authorisation.
 */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { session, justSignedOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin =
    session.status === "signedIn" &&
    (session.user.role === "admin" || session.user.role === "super_admin");
  const allowed = session.status === "signedIn" && (!admin || isAdmin);

  useEffect(() => {
    if (session.status === "signedOut" && !justSignedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (session.status === "expired") router.replace("/session-expired");
    else if (session.status === "unavailable") router.replace("/account-unavailable");
    else if (session.status === "signedIn" && admin && !isAdmin) router.replace("/dashboard");
  }, [session.status, justSignedOut, admin, isAdmin, pathname, router]);

  if (!allowed) return <LoadingBlock label="Checking your account" />;
  return <>{children}</>;
}
