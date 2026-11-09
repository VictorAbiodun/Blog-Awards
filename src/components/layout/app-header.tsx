"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";
import { formatNaira } from "@/lib/format";
import { api } from "@/services";
import { DEMO_CHANGE_EVENT } from "@/services/demo/store";

function useBalance(): number | null {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.getWallet().then(
        (wallet) => {
          if (!cancelled) setBalance(wallet.balanceKobo);
        },
        () => undefined,
      );
    load();
    window.addEventListener(DEMO_CHANGE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(DEMO_CHANGE_EVENT, load);
    };
  }, []);
  return balance;
}

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/nominees", label: "Nominees" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/wallet", label: "Wallet" },
];

const tabs = [
  { href: "/dashboard", label: "Home" },
  { href: "/nominees", label: "Nominees" },
  { href: "/wallet", label: "Wallet" },
  { href: "/settings", label: "Account" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Top bar for signed-in pages, plus a tab bar on phones. */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useSession();
  const balance = useBalance();
  const name = session.status === "signedIn" ? session.user.displayName : "";
  const isAdmin = session.status === "signedIn" && session.user.role === "admin";

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3.5 md:px-6 md:py-[18px]">
        <Link href="/" className="font-display text-[28px] leading-none md:text-[32px]">
          BLOG AWARD 2.0
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={`text-xl underline-offset-4 aria-[current=page]:font-bold aria-[current=page]:underline ${
                isActive(pathname, link.href) ? "" : "font-medium"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link href="/admin" className="text-xl font-medium underline-offset-4 hover:underline">
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3 md:gap-4">
          {balance !== null ? <span className="text-lg font-semibold">{formatNaira(balance)}</span> : null}
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            className="hidden text-lg underline-offset-4 aria-[current=page]:font-bold aria-[current=page]:underline md:inline"
          >
            Account settings
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="hidden text-lg font-medium underline-offset-4 hover:underline md:inline"
          >
            Log out
          </button>
          <Link href="/settings" aria-label="Account settings">
            <Avatar name={name || "?"} size={40} />
          </Link>
        </div>
      </header>

      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 flex justify-between bg-surface px-5 py-4 md:hidden">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive(pathname, tab.href) ? "page" : undefined}
            className="text-[17px] font-medium aria-[current=page]:font-bold aria-[current=page]:underline"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
