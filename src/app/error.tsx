"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors for tracking
    console.error("[Application Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <div className="flex max-w-lg flex-col items-center gap-6">
        <span aria-hidden="true" className="font-display text-8xl text-orange">
          !
        </span>
        <h1 className="font-display text-5xl uppercase tracking-wide md:text-6xl">
          Something went wrong
        </h1>
        <p className="text-xl text-muted leading-relaxed">
          An unexpected error occurred while loading this page. Please try again or return to the homepage.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted">Error reference: {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button tone="gold" size="md" onClick={() => reset()}>
            Try again
          </Button>
          <Link
            href="/"
            className="px-6 py-3.5 text-lg font-bold underline underline-offset-4 text-ink hover:text-gold"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
