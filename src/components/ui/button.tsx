import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type Tone = "gold" | "mint" | "ink" | "elevated" | "ground" | "black" | "orange";
export type PanelTone = "gold" | "mint" | "orange" | "grey" | "ink" | "surface" | "elevated" | "ground";

const toneClass: Record<Tone, string> = {
  gold: "bg-gold text-on-color",
  mint: "bg-mint text-on-color",
  ink: "bg-ink text-on-color",
  orange: "bg-orange text-on-color",
  elevated: "bg-elevated text-ink",
  ground: "bg-ground text-ink",
  black: "bg-on-color text-ink",
};

/** Panel backgrounds, each paired with a text colour that stays readable on it. */
export const panelClass: Record<PanelTone, string> = {
  gold: "bg-gold text-on-color",
  mint: "bg-mint text-on-color",
  orange: "bg-orange text-on-color",
  grey: "bg-grey text-on-color",
  ink: "bg-ink text-on-color",
  surface: "bg-surface text-ink",
  elevated: "bg-elevated text-ink",
  ground: "bg-ground text-ink",
};

const sizeClass = {
  sm: "px-5 py-2.5 text-lg",
  md: "px-8 py-4 text-[19px] md:text-xl",
  lg: "px-8 py-5 text-xl md:text-[22px]",
} as const;

interface Look {
  tone?: Tone;
  size?: keyof typeof sizeClass;
  full?: boolean;
}

function look({ tone = "gold", size = "md", full = false }: Look, extra = "") {
  return [
    "inline-flex items-center justify-center text-center font-bold leading-none select-none transition-all duration-150 active:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    toneClass[tone],
    sizeClass[size],
    full ? "w-full" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  tone,
  size,
  full,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return <button type={type} className={look({ tone, size, full }, className)} {...props} />;
}

export function LinkButton({ tone, size, full, className, ...props }: ComponentProps<typeof Link> & Look) {
  return <Link className={look({ tone, size, full }, className)} {...props} />;
}
