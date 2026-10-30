const steps = [
  {
    title: "First, make an account.",
    body: "Register with your email and confirm it. No account, no wallet, no votes.",
    panel: "bg-gold ml-0 md:col-start-1",
  },
  {
    title: "Then fund your wallet.",
    body: "Top up credits through secure checkout. They land only after our server verifies the payment.",
    panel: "bg-mint ml-[6vw] md:col-start-3",
  },
  {
    title: "Now back an artist.",
    body: "Spend credits on approved nominees while voting is open. Every vote is tied to a wallet debit.",
    panel: "bg-orange ml-[12vw] md:col-start-5",
  },
  {
    title: "Winners get published.",
    body: "Administrators publish the winners when the season closes.",
    panel: "bg-grey ml-[18vw] md:col-start-7",
  },
] as const;

/** Four steps that climb across the page, each on its own colour panel. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-4 px-5 py-14 md:px-6 md:py-[120px]">
      <h2 id="how-title" className="sr-only">
        How voting works
      </h2>
      <ol className="grid grid-cols-1 gap-2 md:grid-cols-12 md:gap-x-6">
        {steps.map((step) => (
          <li key={step.title} className={`${step.panel} p-5 text-on-color md:ml-0 md:col-end-13 md:p-7`}>
            <p className="font-display text-[46px] uppercase leading-none tracking-[-0.01em] md:text-[64px]">
              {step.title}
            </p>
            <p className="mt-2.5 max-w-[420px] text-[17px] leading-[1.45] md:text-xl">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
