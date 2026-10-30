# Architecture

## Principles

1. **Presentation and authority are separate.** The browser shows things and asks for actions.
   The server decides: payments, privileged database work and vote totals never run in
   browser-only code.
2. **The database enforces the rules.** Row Level Security, constraints and transactions are the
   last line of defence, so a bug in the app cannot quietly break them.
3. **Money is integer kobo.** NGN 1,000 is `100000`. No floating-point money anywhere.
4. **Nothing pretends to work.** If a payment, wallet top-up or vote is not verified, the site
   says so.
5. **Few dependencies.** Free and open-source tools only; a package is added when a feature first
   needs it, not before.

## Directory structure (what exists now)

```
blog-award-2/
├─ .env.example              documented template, placeholders only
├─ CHECKLIST.md              what is done and what is left
├─ README.md                 install, start, configuration, testing notes
├─ docs/
│  └─ ARCHITECTURE.md        this file
├─ public/                   static files
├─ src/
│  ├─ instrumentation.ts     runs at server start; refuses unsafe configuration
│  ├─ app/                   routes (Next.js App Router)
│  │  ├─ layout.tsx          fonts, metadata, skip link, header and footer
│  │  ├─ page.tsx            public homepage
│  │  ├─ globals.css         design tokens and base styles
│  │  ├─ icon.svg            site icon
│  │  └─ api/health/route.ts configuration health check
│  ├─ components/
│  │  ├─ layout/             SiteHeader, SiteFooter
│  │  └─ home/               Hero, HowItWorks (+ tests)
│  └─ lib/
│     ├─ config/
│     │  ├─ safety.ts        pure rules: what counts as unsafe (+ tests)
│     │  ├─ public-env.ts    browser-safe settings, validated with Zod
│     │  └─ server-env.ts    server-only settings (import "server-only")
│     └─ supabase/
│        ├─ browser.ts       client for client components (anon key)
│        ├─ server.ts        client acting as the signed-in user (RLS applies)
│        └─ admin.ts         service-role client, server only, bypasses RLS
├─ supabase/
│  ├─ config.toml            local Supabase settings
│  ├─ migrations/            schema, one file per change
│  └─ tests/database/        pgTAP tests for security rules
├─ vitest.config.mts         test runner configuration
└─ vitest.setup.ts           test setup
```

## Planned modules (not created yet)

These match the project brief. Each is created in the level that first needs it, with real code
and tests, so there are no empty folders.

| Module | Level | Where it will live |
| --- | --- | --- |
| Authentication pages and session handling | 3 | `src/app/(auth)/`, `src/lib/auth/` |
| User dashboard, settings | 2-3 | `src/app/(app)/dashboard`, `.../settings` |
| Nominees, categories, voting interface | 2-4 | `src/app/nominees`, `src/features/voting/` |
| Wallet and ledger | 3-4 | `src/features/wallet/`, `supabase/migrations/` |
| Payment provider adapters (mock, Paystack) | 4 | `src/lib/payments/` |
| Leaderboards, winners | 3-4 | `src/features/leaderboard/` |
| Admin dashboard | 3 | `src/app/admin/` |
| Validation schemas | 3+ | `src/lib/validation/` |

## How the configuration guard works

`src/lib/config/safety.ts` is a pure function with no Next.js imports, so the same rules run in
three places:

- at server start through `src/instrumentation.ts` (the server stops and prints every problem),
- in `/api/health` (reports problems outside production, only a count in production),
- in unit tests.

The checks are skipped during `next build`, because builds run on machines that do not hold
production secrets. They run on every real server start.

## Design system

The look comes from the Figma file "Blog Award 2.0 - UI Design" (the "mixed theme" page). Tokens in
`src/app/globals.css`: `ground`, `surface`, `elevated`, `ink`, `muted`, `gold`, `mint`, `orange`,
`grey`, `on-color`; fonts `font-display` (Bebas Neue) and `font-text` (EB Garamond). Both fonts are
installed from npm (`@fontsource`), so nothing is fetched from Google at build or run time.

Colour is never the only signal: statuses are words, selected items say "Selected", and keyboard
focus shows a gold outline.

## Next.js 16 notes

This project uses Next.js 16 with Cache Components enabled (`cacheComponents` in `next.config.ts`).
Code that reads request data (cookies, headers) must run inside a request context, for example
behind `<Suspense>` or `await connection()`. The bundled docs are in
`node_modules/next/dist/docs/`.
