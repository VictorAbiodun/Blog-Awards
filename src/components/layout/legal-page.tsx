import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  id?: string;
  heading: string;
  body: ReactNode;
}

/** A plain-language policy page with a visible "draft" notice and the decisions still open. */
export function LegalPage({
  title,
  intro,
  decisions,
  sections,
}: {
  title: string;
  intro: string;
  decisions: string[];
  sections: LegalSection[];
}) {
  return (
    <main id="main" className="px-5 pb-24 pt-6 md:px-6 md:pb-32 md:pt-10">
      <h1 className="font-display text-[24vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(13.9vw,13rem)]">{title}</h1>
      <p className="mt-4 max-w-[720px] text-xl leading-[1.45]">{intro}</p>

      <aside aria-label="Draft notice" className="mt-8 max-w-[720px] bg-grey p-5 text-on-color md:p-7">
        <p className="text-xl font-bold">Draft policy</p>
        <p className="mt-1 text-lg leading-[1.4]">
          This is a plain-language draft, not legal advice. Have a qualified lawyer review and complete it before real money is taken. Decisions still open:
        </p>
        <ul className="mt-3 list-disc pl-6 text-lg leading-[1.4]">
          {decisions.map((decision) => (
            <li key={decision}>{decision}</li>
          ))}
        </ul>
      </aside>

      <div className="mt-12 flex max-w-[720px] flex-col gap-10 md:mt-16">
        {sections.map((section) => (
          <section key={section.heading} id={section.id} className="scroll-mt-6">
            <h2 className="text-[28px] font-bold leading-[1.15] md:text-[32px]">{section.heading}</h2>
            <div className="mt-3 flex flex-col gap-3 text-xl leading-[1.5]">{section.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-14 text-lg">
        Questions?{" "}
        <Link href="/contact" className="font-semibold underline underline-offset-4">
          Contact us
        </Link>
        .
      </p>
    </main>
  );
}
