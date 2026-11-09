"use client";

import Link from "next/link";
import { useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { useSession } from "@/hooks/session";

const links = [
  { href: "/nominees", label: "Nominees" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/#how-it-works", label: "How voting works" },
  { href: "/#faq", label: "FAQ" },
];

/** Header for public pages. Wordmark left, links right, one coloured button. */
export function SiteHeader() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const signedIn = session.status === "signedIn";

  return (
    <header className="relative">
      <div className="flex items-center justify-between px-5 py-3.5 md:px-6 md:py-[18px]">
        <Link href="/" className="font-display text-[28px] leading-none md:text-[32px]">
          BLOG AWARD 2.0
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-xl font-medium underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
          <Link href={signedIn ? "/dashboard" : "/login"} className="text-xl font-medium underline-offset-4 hover:underline">
            {signedIn ? "Dashboard" : "Log in"}
          </Link>
          <LinkButton href={signedIn ? "/nominees" : "/register"} size="sm">
            Start voting
          </LinkButton>
        </nav>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="text-xl font-bold underline underline-offset-4 md:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <nav id="mobile-menu" aria-label="Main" className="flex flex-col gap-1 bg-surface px-5 pb-6 pt-2 md:hidden">
          {[...links, { href: signedIn ? "/dashboard" : "/login", label: signedIn ? "Dashboard" : "Log in" }].map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-3 text-2xl font-medium">
              {link.label}
            </Link>
          ))}
          <LinkButton href={signedIn ? "/nominees" : "/register"} full className="mt-3" onClick={() => setOpen(false)}>
            Start voting
          </LinkButton>
        </nav>
      ) : null}
    </header>
  );
}
