/** Formats integer kobo as naira, e.g. 100000 -> "₦1,000". */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  const hasKobo = kobo % 100 !== 0;
  const text = naira.toLocaleString("en-NG", {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `\u20a6${text}`;
}

/** Signed amount for ledger lists, e.g. "+₦1,000" or "−₦150". */
export function formatSignedNaira(kobo: number): string {
  if (kobo === 0) return formatNaira(0);
  return `${kobo > 0 ? "+" : "\u2212"}${formatNaira(Math.abs(kobo))}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-NG");
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "?";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Naira typed by a person ("1,000" or "1000.50") to integer kobo, or null if invalid. */
export function nairaTextToKobo(text: string): number | null {
  const cleaned = text.replace(/[,\s\u20a6]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
