import type { Metadata } from "next";

import { NomineesBrowser } from "@/components/artists/nominees-browser";

export const metadata: Metadata = { title: "Nominees" };

export default function NomineesPage() {
  return (
    <main id="main">
      <div className="px-5 pb-6 pt-6 md:px-6 md:pb-8 md:pt-10">
        <h1 className="font-display text-[26vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(13.9vw,13rem)]">Nominees</h1>
        <p className="mt-2 text-lg text-muted md:text-xl">Only approved artists appear here.</p>
      </div>
      <NomineesBrowser />
    </main>
  );
}
