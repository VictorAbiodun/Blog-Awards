"use client";

import { isDemoMode } from "@/lib/demo-mode";
import { resetDemoData } from "@/services/demo/store";

/** Shown only in demo mode, so nobody mistakes the fake data for the real thing. */
export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div role="note" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-elevated px-4 py-2 text-center text-[15px] text-muted">
      <span>
        <strong className="font-semibold text-ink">Demo mode.</strong> Fake data and simulated payments. No real money moves.
      </span>
      <button type="button" onClick={resetDemoData} className="font-semibold text-ink underline underline-offset-2">
        Reset demo data
      </button>
    </div>
  );
}
