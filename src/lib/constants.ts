import { isDemoMode } from "./demo-mode";

/** Sample price shown on marketing pages. The real price comes from the season settings. */
export const SAMPLE_VOTE_PRICE_KOBO = 5000;
export const VOTE_COUNT_CHOICES = [1, 3, 5, 10] as const;
export const TOP_UP_CHOICES_KOBO = [25000, 50000, 100000, 200000] as const;
export const FUNDING_PRESET_AMOUNTS_NAIRA = [500, 1000, 2500, 5000, 10000, 20000] as const;
export const DEFAULT_NAIRA_PER_POINT = 50;

export const SITE_NAME = "Blog Award 2.0";
export const DEMO = isDemoMode;
