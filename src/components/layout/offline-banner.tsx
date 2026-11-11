"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyConnectivity() {
      if (typeof navigator === "undefined") return;

      // If browser reports offline, verify with a lightweight ping to avoid false positives (e.g. local loopback/virtual adapters)
      if (!navigator.onLine) {
        try {
          const res = await fetch("/api/health", { method: "HEAD", cache: "no-store" });
          if (!cancelled && res.ok) {
            setIsOffline(false);
            return;
          }
        } catch {
          if (!cancelled) {
            setIsOffline(true);
            setDismissed(false);
          }
          return;
        }
      } else {
        if (!cancelled) setIsOffline(false);
      }
    }

    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
      setBackOnline(true);
      const timer = setTimeout(() => setBackOnline(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      void verifyConnectivity();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (backOnline) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-center bg-mint px-4 py-2 text-center text-sm font-bold text-on-color shadow-md"
      >
        <span>✓ Your internet connection has been restored.</span>
      </aside>
    );
  }

  if (!isOffline || dismissed) return null;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 bg-orange px-4 py-2 text-sm font-bold text-on-color shadow-md"
    >
      <div className="flex items-center gap-2 mx-auto">
        <span aria-hidden="true" className="text-base font-bold">!</span>
        <span>You appear to be offline. Please check your internet connection.</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded px-2 py-0.5 text-xs font-bold hover:bg-black/20 transition-colors"
        aria-label="Dismiss offline banner"
      >
        Dismiss
      </button>
    </aside>
  );
}
