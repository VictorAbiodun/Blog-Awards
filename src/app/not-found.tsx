import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-col items-start gap-6 px-5 pb-24 pt-10 md:px-6 md:pb-40">
        <h1 className="font-display text-[22vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(14vw,13rem)]">
          Page not
          <br />
          found.
        </h1>
        <p className="max-w-[560px] text-xl leading-[1.45]">That page does not exist, or it has moved.</p>
        <LinkButton href="/" size="lg">
          Back to home
        </LinkButton>
      </main>
      <SiteFooter />
    </>
  );
}
