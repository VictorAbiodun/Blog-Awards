import type { Metadata } from "next";
import { Suspense } from "react";

import { ContactForm } from "@/components/layout/contact-form";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <main id="main" className="px-5 pb-24 pt-6 md:px-6 md:pb-32 md:pt-10">
      <h1 className="font-display text-[24vw] uppercase leading-[0.88] tracking-[-0.02em] md:text-[min(13.9vw,13rem)]">Contact us</h1>
      <p className="mb-10 mt-4 max-w-[640px] text-xl leading-[1.45]">Questions, account help, payment help, or an artist you think we should know about.</p>
      <Suspense fallback={null}>
        <ContactForm />
      </Suspense>
    </main>
  );
}
