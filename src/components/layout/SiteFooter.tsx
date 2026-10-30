export function SiteFooter() {
  return (
    <footer className="bg-ink px-5 pb-10 pt-14 text-on-color md:px-6 md:pb-12">
      <p
        aria-label="Blog Award 2.0"
        className="overflow-hidden whitespace-nowrap font-display uppercase leading-[0.85] tracking-[-0.02em] text-[calc((100vw-40px)/4.78)] md:text-[calc((100vw-48px)/4.78)]"
      >
        Blog Award 2.0
      </p>
      <div className="mt-14 flex items-end justify-between gap-6 md:mt-20">
        <p className="max-w-[230px] text-sm leading-[1.3] md:max-w-none md:text-base">
          Voting credits are prepaid credits for voting only and are not bank deposits. &copy; Blog Award 2.0
        </p>
        <a
          href="#top"
          className="shrink-0 bg-on-color px-4 py-2.5 text-[15px] font-bold text-ink md:px-[18px] md:text-base"
        >
          Back to top
        </a>
      </div>
    </footer>
  );
}
