"use client";

import { createContext, useCallback, useContext, useId, useState, type ReactNode } from "react";

export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { bg: string; icon: string }> = {
  success: { bg: "bg-mint text-on-color", icon: "✓" },
  info: { bg: "bg-gold text-on-color", icon: "i" },
  error: { bg: "bg-orange text-on-color", icon: "!" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = `${idPrefix}-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, tone }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [idPrefix, removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
      >
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${style.bg}`}
            >
              <span aria-hidden="true" className="font-bold text-lg">
                {style.icon}
              </span>
              <span className="font-semibold text-base">{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="ml-2 font-bold opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside ToastProvider
    return {
      showToast: (msg: string) => {
        if (typeof window !== "undefined") {
          console.log("[Toast]", msg);
        }
      },
    };
  }
  return ctx;
}
