import type { Metadata, Viewport } from "next";

import "@fontsource/bebas-neue/index.css";
import "@fontsource-variable/eb-garamond/wght.css";
import "./globals.css";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Blog Award 2.0",
    template: "%s | Blog Award 2.0",
  },
  description:
    "Blog Award 2.0 is where fans vote with prepaid credits for Nigeria's upcoming and independent artists.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body id="top" className="min-h-svh bg-ground text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-3 focus:font-bold focus:text-on-color"
        >
          Skip to main content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
