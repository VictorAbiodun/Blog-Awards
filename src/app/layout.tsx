import type { Metadata, Viewport } from "next";

import "@fontsource/bebas-neue/index.css";
import "@fontsource-variable/eb-garamond/wght.css";
import "./globals.css";

import { DemoBanner } from "@/components/layout/demo-banner";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/hooks/session";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Blog Award 2.0 | Celebrating Nigeria's Next Big Musical Talents",
    template: "%s | Blog Award 2.0",
  },
  description:
    "Blog Award 2.0 is where fans vote with prepaid credits for Nigeria's upcoming and independent artists.",
  keywords: ["Nigeria music awards", "independent artists", "fan voting", "afrobeats", "blog award"],
  authors: [{ name: "Blog Award Team" }],
  openGraph: {
    title: "Blog Award 2.0 | Vote Nigeria's Next Big One",
    description:
      "Vote with prepaid points for Nigeria's next generation of independent musical talents.",
    url: "/",
    siteName: "Blog Award 2.0",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog Award 2.0 | Vote Nigeria's Next Big One",
    description:
      "Vote with prepaid points for Nigeria's next generation of independent musical talents.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body id="top" className="min-h-svh bg-ground text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-3 focus:font-bold focus:text-on-color"
        >
          Skip to main content
        </a>
        <OfflineBanner />
        <ToastProvider>
          <SessionProvider>
            <DemoBanner />
            {children}
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
