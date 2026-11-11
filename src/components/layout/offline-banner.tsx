"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? !navigator.onLine : false;
  });
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setBackOnline(true);
      const timer = setTimeout(() => setBackOnline(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setBackOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
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

  if (!isOffline) return null;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-orange px-4 py-2 text-center text-sm font-bold text-on-color shadow-md"
    >
      <span aria-hidden="true">!</span>
      <span>You are currently offline. Please check your internet connection.</span>
    </aside>
  );
}
