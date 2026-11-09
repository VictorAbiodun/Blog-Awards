import Link from "next/link";

const columns = [
  [
    { href: "/nominees", label: "Nominees" },
    { href: "/nominees", label: "Categories" },
    { href: "/leaderboard", label: "Leaderboard" },
  ],
  [
    { href: "/terms#voting-rules", label: "Rules" },
    { href: "/#faq", label: "FAQ" },
    { href: "/leaderboard#winners", label: "Winners" },
  ],
  [
    { href: "/privacy", label: "Privacy" },
    { href: "/refunds", label: "Refund policy" },
    { href: "/terms", label: "Terms" },
  ],
];

const places = [
  { href: "/contact", label: "Contact us" },
  { href: "/contact?subject=suggest-artist", label: "Nominate an artist" },
  { href: "/login", label: "Log in" },
];

/** The name at full width, black on white, with every link the design calls for. */
export function SiteFooter() {
  return (
    <footer className="bg-ink px-5 pb-10 pt-14 text-on-color md:px-6 md:pb-12">
      <p
        aria-label="Blog Award 2.0"
        style={{ "--chars": 14 } as React.CSSProperties}
        className="fit-wide overflow-hidden whitespace-nowrap font-display uppercase leading-[0.85] tracking-[-0.02em]"
      >
        Blog Award 2.0
      </p>

      <div className="mt-14 flex flex-col gap-10 md:mt-20 md:flex-row md:justify-between">
        <ul className="flex flex-col gap-1.5 text-[26px] font-medium leading-[1.25] md:text-4xl">
          {places.map((place) => (
            <li key={place.label}>
              <Link href={place.href} className="underline-offset-4 hover:underline">
                {place.label}
              </Link>
            </li>
          ))}
        </ul>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-8 md:mr-[10%] md:grid-cols-3 md:gap-x-12">
          {columns.map((column, index) => (
            <ul key={index} className="flex flex-col gap-3 text-lg font-medium">
              {column.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </nav>
      </div>

      <div className="mt-14 flex items-end justify-between gap-6 md:mt-20">
        <p className="max-w-[230px] text-sm leading-[1.3] md:max-w-none md:text-base">
          Voting credits are prepaid credits for voting only and are not bank deposits. &copy; Blog Award 2.0
        </p>
        <a href="#top" className="shrink-0 bg-on-color px-4 py-2.5 text-[15px] font-bold text-ink md:px-[18px] md:text-base">
          Back to top
        </a>
      </div>
    </footer>
  );
}
