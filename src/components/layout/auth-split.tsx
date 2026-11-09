import Link from "next/link";
import type { ReactNode } from "react";

import { panelClass, type PanelTone } from "@/components/ui/button";

/**
 * The split screen used by every account page: a big colour panel with a shouted
 * headline on one side, the form or message on the other (stacked on phones).
 */
export function AuthSplit({
  tone,
  headline,
  sentence,
  title,
  children,
}: {
  tone: PanelTone;
  /** Use \n for a line break. */
  headline: string;
  sentence: string;
  title: string;
  children: ReactNode;
}) {
  const lines = headline.split("\n");
  // Bebas Neue letters are not equally wide: W and M are wider, spaces and full stops narrower.
  const weight = (line: string) => [...line].reduce((sum, ch) => sum + ("WM".includes(ch) ? 1.4 : ch === " " ? 0.5 : ch === "." || ch === "," ? 0.55 : ch === "I" ? 0.6 : 1), 0);
  const longest = Math.max(...lines.map(weight));

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <section aria-label="Blog Award 2.0" className={`flex flex-col justify-between gap-8 px-5 pb-8 pt-4 md:min-h-svh md:w-1/2 md:px-6 md:pb-8 md:pt-[18px] ${panelClass[tone]}`}>
        <Link href="/" className="font-display text-[28px] leading-none md:text-[32px]">
          BLOG AWARD 2.0
        </Link>
        <p
          aria-hidden="true"
          style={{ "--chars": longest } as React.CSSProperties}
          className="fit-heading font-display uppercase leading-[0.88] tracking-[-0.02em]"
        >
          {lines.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </p>
        <p className="hidden max-w-[460px] text-[22px] leading-[1.4] md:block">{sentence}</p>
      </section>

      <section className="flex flex-1 flex-col justify-center px-5 py-8 md:w-1/2 md:px-28 md:py-16">
        <div className="mx-auto flex w-full max-w-[496px] flex-col gap-5 md:mx-0">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.01em] md:text-[40px]">{title}</h1>
          <p className="text-lg leading-[1.4] text-muted md:hidden">{sentence}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
