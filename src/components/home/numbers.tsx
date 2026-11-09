import { formatNaira } from "@/lib/format";
import { SAMPLE_VOTE_PRICE_KOBO } from "@/lib/constants";

function Tile({ className, figure, caption, figureSize }: { className: string; figure: string; caption: string; figureSize: string }) {
  return (
    <div className={`flex flex-col justify-between p-5 md:p-7 ${className}`}>
      <p className={`font-display leading-[0.9] tracking-[-0.02em] ${figureSize}`}>{figure}</p>
      <p className="text-base leading-[1.4] md:text-xl">{caption}</p>
    </div>
  );
}

/** Three facts on three tiles that deliberately refuse to line up. */
export function Numbers() {
  return (
    <section aria-labelledby="numbers-title" className="px-5 py-14 md:px-6 md:py-16">
      <div className="grid gap-1.5 md:grid-cols-12 md:gap-2">
        <h2 id="numbers-title" className="pb-3 text-[30px] font-bold leading-[1.1] md:col-span-6 md:col-start-7 md:pb-5 md:text-4xl">
          Voting in numbers
        </h2>

        <Tile
          className="min-h-[230px] bg-mint text-on-color md:col-span-6 md:row-span-2 md:row-start-2 md:h-[630px]"
          figure={formatNaira(SAMPLE_VOTE_PRICE_KOBO)}
          figureSize="text-[130px] md:text-[clamp(120px,12.5vw,180px)]"
          caption="Sample price of one vote. The final price is published with the season rules."
        />
        <div className="grid grid-cols-2 gap-1.5 md:contents">
          <Tile
            className="min-h-[210px] bg-elevated text-ink md:col-span-3 md:col-start-7 md:row-start-2 md:mt-[126px] md:h-[396px]"
            figure="1"
            figureSize="text-[96px] md:text-[clamp(120px,12.5vw,180px)]"
            caption="Wallet per fan, held in naira. Your balance always comes from our server ledger."
          />
          <Tile
            className="mt-8 min-h-[210px] bg-grey text-on-color md:col-span-3 md:col-start-10 md:row-start-2 md:mt-[234px] md:h-[306px]"
            figure="0"
            figureSize="text-[96px] md:text-[clamp(120px,12.5vw,180px)]"
            caption="Ways to move credits between fans or cash them out. Credits are for voting only."
          />
        </div>
      </div>
    </section>
  );
}
