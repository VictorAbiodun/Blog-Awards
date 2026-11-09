const TRUTHY = ["true", "1", "yes", "on"];

/**
 * Demo mode swaps the real backend for fake, in-browser data and simulated
 * payments.
 *
 * - NEXT_PUBLIC_DEMO_MODE=true  -> on
 * - NEXT_PUBLIC_DEMO_MODE=false -> off
 * - not set                     -> on only for `npm run dev`, never in a production build
 *
 * NEXT_PUBLIC_ variables are inlined at build time. The production start guard
 * and the production build both refuse to run with demo mode switched on.
 */
const setting = process.env.NEXT_PUBLIC_DEMO_MODE;

export const isDemoMode =
  setting === undefined || setting.trim() === ""
    ? process.env.NODE_ENV === "development"
    : TRUTHY.includes(setting.trim().toLowerCase());
