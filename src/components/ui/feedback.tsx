"use client";

import type { ReactNode } from "react";

import { errorMessage } from "@/lib/error-message";
import { initials } from "@/lib/format";

import { Button, panelClass, type PanelTone } from "./button";

/** An error or information banner. Errors are announced to screen readers. */
export function Notice({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 px-4 py-3.5 text-lg font-medium leading-[1.35] ${
        tone === "error" ? "bg-orange text-on-color" : "bg-elevated text-ink"
      }`}
    >
      <span aria-hidden="true" className="font-bold">
        {tone === "error" ? "!" : "i"}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="px-5 py-16 text-xl text-muted md:px-6">
      {label}&hellip;
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 px-5 py-12 md:px-6">
      <Notice>{errorMessage(error)}</Notice>
      {onRetry ? (
        <Button tone="elevated" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Avatar({ name, size = 72, tone = "mint", ink = "on-color" }: { name: string; size?: number; tone?: PanelTone; ink?: "on-color" | "ink" }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className={`inline-flex shrink-0 items-center justify-center font-display leading-none ${panelClass[tone]} ${
        ink === "ink" ? "text-ink" : ""
      }`}
    >
      {initials(name)}
    </span>
  );
}

/** A big headline panel for states such as "Voting is closed". */
export function StatusPanel({
  tone,
  headline,
  children,
  actions,
}: {
  tone: PanelTone;
  headline: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className={`flex flex-col gap-3 p-5 md:p-7 ${panelClass[tone]}`}>
        <h2 className="font-display text-[72px] uppercase leading-[0.9] md:text-[88px]">{headline}</h2>
        <div className="text-xl leading-[1.4]">{children}</div>
      </div>
      {actions ? <div className="flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </section>
  );
}

export function ChoiceTile({
  selected,
  onClick,
  children,
  sub,
  tall = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  sub?: string;
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-2 ${tall ? "h-24 md:h-28" : "h-20 md:h-24"} ${
        selected ? "bg-gold text-on-color" : "bg-ground text-ink"
      }`}
    >
      <span className="font-display text-[36px] leading-none md:text-5xl">{children}</span>
      <span className="text-base font-semibold leading-none">{selected ? "Selected" : (sub ?? "")}</span>
    </button>
  );
}

export function FilterChip({
  selected,
  onClick,
  children,
  prefix = "Showing: ",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  prefix?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-4 py-2.5 text-lg ${selected ? "bg-gold font-bold text-on-color" : "bg-elevated font-medium text-ink"}`}
    >
      {selected ? prefix : ""}
      {children}
    </button>
  );
}
