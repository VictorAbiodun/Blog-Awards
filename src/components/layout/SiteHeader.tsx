import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-5 py-3.5 md:px-6 md:py-[18px]">
      <Link href="/" className="font-display text-[28px] leading-none md:text-[32px]">
        BLOG AWARD 2.0
      </Link>
      <nav aria-label="Main">
        <a href="#how-it-works" className="text-lg font-medium underline-offset-4 hover:underline md:text-xl">
          How voting works
        </a>
      </nav>
    </header>
  );
}
