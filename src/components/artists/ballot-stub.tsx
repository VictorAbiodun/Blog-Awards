/**
 * The ballot stub: the page's central picture. Sizes use container query units
 * (cqw), so it scales with whatever it sits in. It is decoration for a nominee,
 * so the name is also written out in the page text beside it.
 */
export function BallotStub({
  name,
  category,
  price,
  notchClass = "bg-elevated",
}: {
  name: string;
  category: string;
  price: string;
  /** Must match the colour of the plate behind the stub, so the notches look cut out. */
  notchClass?: string;
}) {
  const [first, ...rest] = name.split(" ");
  return (
    <div className="@container w-full" aria-hidden="true">
      <div className="relative aspect-[520/300] w-full bg-ink text-on-color">
        <p className="absolute left-[5.4%] top-[8%] font-display uppercase leading-[0.88] text-[15cqw]">
          {first}
          {rest.length ? <br /> : null}
          {rest.join(" ")}
        </p>
        <p className="absolute bottom-[8%] left-[5.4%] max-w-[60%] text-[max(14px,4.2cqw)] font-semibold leading-tight">{category}</p>
        <p className="absolute left-[75.4%] top-[9%] font-display uppercase leading-none text-[8.5cqw]">1 vote</p>
        <p className="absolute bottom-[8%] left-[75.4%] text-[max(14px,4.2cqw)] font-semibold leading-tight">{price}</p>
        <span className={`absolute -top-[4.2cqw] left-[67.3%] size-[8.5cqw] rounded-full ${notchClass}`} />
        <span className={`absolute -bottom-[4.2cqw] left-[67.3%] size-[8.5cqw] rounded-full ${notchClass}`} />
      </div>
    </div>
  );
}
