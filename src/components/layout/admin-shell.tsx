"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/feedback";
import { useSession } from "@/hooks/session";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/funding", label: "Wallet Funding" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/season", label: "Season & rules" },
  { href: "/admin/payments", label: "Archived Payments" },
  { href: "/admin/suspicious", label: "Suspicious activity" },
  { href: "/admin/winners", label: "Winners & reports" },
  { href: "/admin/audit", label: "Audit log" },
];

function Links({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1.5">
      {nav.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`block px-3 py-2.5 text-[19px] ${active ? "bg-gold font-bold text-on-color underline" : "font-medium"}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { session, signOut: endSession } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await endSession();
    router.push("/");
  };
  const name = session.status === "signedIn" ? session.user.displayName : "Admin";

  return (
    <div className="md:flex md:min-h-svh">
      <aside className="hidden w-[280px] shrink-0 flex-col justify-between bg-surface px-5 py-7 md:flex">
        <div className="flex flex-col gap-7">
          <div>
            <Link href="/" className="font-display text-[30px] leading-none">
              BLOG AWARD 2.0
            </Link>
            <p className="mt-1 text-[19px] font-semibold text-muted">Admin</p>
          </div>
          <nav aria-label="Admin">
            <Links />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={name} size={40} />
          <button type="button" onClick={() => void signOut()} className="text-lg font-medium underline underline-offset-4">
            Log out
          </button>
        </div>
      </aside>

      <div className="md:hidden">
        <div className="flex items-center justify-between bg-surface px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="font-display text-[26px] leading-none">
              BLOG AWARD 2.0
            </Link>
            <span className="text-lg font-semibold text-muted">Admin</span>
          </div>
          <button type="button" aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((v) => !v)} className="text-xl font-bold underline underline-offset-4">
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open ? (
          <nav id="admin-menu" aria-label="Admin" className="bg-surface px-5 pb-5">
            <Links onNavigate={() => setOpen(false)} />
            <button type="button" onClick={() => void signOut()} className="mt-4 text-lg font-medium underline underline-offset-4">
              Log out
            </button>
          </nav>
        ) : null}
      </div>

      <main id="main" className="min-w-0 flex-1 px-5 pb-24 pt-6 md:px-10 md:pb-24 md:pt-8">
        {children}
      </main>
    </div>
  );
}

/** Big page title with the season on the right, as in the designs. */
export function AdminPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8 md:gap-9">
      <header className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <h1 className="font-display text-[22vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(10.4vw,9.4rem)]">{title}</h1>
        <div className="md:text-right">
          <p className="text-[19px] font-semibold">Season: 2026 Awards</p>
          <p className="text-[17px] text-muted">Sample data for design review.</p>
        </div>
      </header>
      {children}
    </div>
  );
}
