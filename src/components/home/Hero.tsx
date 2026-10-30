/**
 * The first screen. The shouted headline sits on top of a tilted ballot slip
 * that rises from the bottom edge. The slip is decoration, so it is hidden
 * from screen readers, and it is clearly labelled as a sample.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="relative h-[520px] overflow-hidden md:h-[calc(100svh-72px)] md:max-h-[920px] md:min-h-[640px]">
        <div className="relative px-5 pt-4 md:px-6 md:pt-8">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-full z-0 -mt-3 aspect-[3/4] w-[64vw] max-w-[389px] -translate-x-1/2 -rotate-[4deg] bg-mint p-[18px] text-on-color md:-mt-[26px] md:w-[27vw] md:p-7"
          >
            <p className="font-display text-[64px] uppercase leading-[0.88] md:text-[6.7vw] md:max-[1440px]:leading-[0.88] min-[1440px]:text-[96px]">
              Sample
              <br />
              Artist 1
            </p>
            <p className="mt-6 text-xl font-semibold md:text-2xl">Best New Artist</p>
            <p className="mt-3 font-display text-[40px] uppercase leading-none md:text-5xl">1 vote = &#8358;50</p>
            <p className="mt-5 text-base md:text-lg">Sample ballot for design review.</p>
          </div>

          <h1
            id="hero-title"
            className="relative z-10 text-center font-display text-[23vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(15.6vw,15rem)]"
          >
            Vote the <br />
            next big one
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-12 pt-8 md:absolute md:inset-x-0 md:bottom-8 md:flex-row md:items-end md:justify-between md:px-6 md:pb-0 md:pt-0">
        <div className="flex max-w-[330px] flex-col items-start gap-5">
          <p className="text-xl leading-[1.4]">
            Blog Award 2.0 is where fans vote with prepaid credits for Nigeria&rsquo;s upcoming and independent
            artists.
          </p>
          <a
            href="#how-it-works"
            className="bg-gold px-8 py-[18px] text-[19px] font-bold text-on-color md:text-xl"
          >
            See how voting works
          </a>
        </div>
        <p className="text-xl md:max-w-[280px] md:text-right">Sample price: &#8358;50 a vote.</p>
      </div>
    </section>
  );
}
