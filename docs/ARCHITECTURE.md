# Architecture

## Principles

1. **Presentation and authority are separate.** The browser shows things and asks for actions. The
   server decides: payments, privileged database work and vote totals never run in browser-only code.
2. **The database enforces the rules.** Row Level Security, constraints and transactions are the
   last line of defence, so a bug in the app cannot quietly break them.
3. **Money is integer kobo.** NGN 1,000 is `100000`. No floating-point money anywhere.
4. **Nothing pretends to work.** If a payment, top-up or vote is not verified, the site says so.
5. **One seam to the backend.** The screens know nothing about Supabase or Paystack. They call
   `api.*` (`BlogAwardApi`), which is either the demo implementation or yours.
6. **Few dependencies.** Free and open-source tools only; a package is added when a feature first needs it.

## Directory structure

```
blog-award-2/
├─ .env.example                  documented template, placeholders only
├─ README.md  CHECKLIST.md       start here
├─ docs/
│  ├─ ARCHITECTURE.md            this file
│  └─ BACKEND-HANDOFF.md         what your backend must provide, method by method
├─ scripts/e2e-demo-flows.py     browser walk-through of every flow (demo mode)
├─ supabase/                     config.toml, migrations/, tests/database/ (pgTAP)
└─ src/
   ├─ instrumentation.ts         runs at server start; refuses unsafe configuration
   ├─ types/domain.ts            the shape of every piece of data
   ├─ services/                  THE SEAM
   │  ├─ api.ts                  BlogAwardApi: every method, input, output, error code
   │  ├─ index.ts                `api` = demo or backend, chosen by NEXT_PUBLIC_DEMO_MODE
   │  ├─ backend-api.ts          YOURS: implement each method for real
   │  └─ demo/                   fake backend in the browser: seed, store, demo-api (+ tests)
   ├─ lib/
   │  ├─ config/                 safety rules, public and server env (+ tests)
   │  ├─ supabase/               browser, server and admin clients
   │  ├─ validation.ts           Zod schemas for every form (+ tests)
   │  ├─ format.ts  form.ts      money and text helpers, safe redirects (+ tests)
   │  └─ demo-mode.ts  constants.ts  error-message.ts
   ├─ hooks/                     session (who is signed in), use-async (loading and errors)
   ├─ components/
   │  ├─ ui/                     Button, Field, Dialog, Notice, StatusPanel, tiles, chips
   │  ├─ layout/                 headers, footer, auth split screen, admin shell, route guard
   │  ├─ home/                   homepage sections
   │  ├─ artists/                ballot stub, browse, nominee page, vote panel, receipt
   │  ├─ auth/                   login, register, reset, check-email forms
   │  ├─ member/                 dashboard, wallet, settings
   │  └─ admin/                  overview, artists, season, payments, winners, audit
   └─ app/                       routes (App Router)
      ├─ (public)/               home, nominees, leaderboard, contact, terms, privacy, refunds
      ├─ (auth)/                 login, register, reset flows, session and account states
      ├─ (member)/               dashboard, wallet, settings, receipts  (login required)
      ├─ admin/                  administrator pages                    (admin required)
      └─ api/health/             configuration health check
```

## How a screen gets data

```
component ──► useAsync(load) ──► api.getWallet() ──► demoApi   (fake data in localStorage)
                                                └──► backendApi (your Supabase / server routes)
```

- Screens never import from `demo/`. Only `services/index.ts` chooses the implementation.
- Every call can fail with an `ApiError` whose `code` the screens understand (list in
  BACKEND-HANDOFF.md). Failures show a plain message with a "Try again" button.
- `RequireAuth` redirects signed-out people, expired sessions, disabled accounts and non-admins.
  **It is a convenience, not security.** Every backend method must re-check permission itself.
- Forms validate with Zod first (`lib/validation.ts`) and show one clear message per field. The
  backend must validate again.

## Demo mode

`NEXT_PUBLIC_DEMO_MODE` swaps in `services/demo/`. It follows the real rules (the balance is the sum
of a ledger, only a verified payment adds credits and only once, a vote and its debit are recorded
together, admin actions are audited), so it doubles as a worked specification. It stores plain-text
fake passwords in local storage, which is why it can **never** run in production: the start guard and
the production build both refuse.

## How the configuration guard works

`src/lib/config/safety.ts` is a pure function with no Next.js imports, so the same rules run at server
start (`instrumentation.ts`), in `/api/health` (details outside production, only a count in
production), and in unit tests. Checks are skipped during `next build` (builds run without
production secrets), except that `next.config.ts` fails a production build that has demo mode on.

## Design system

From the Figma "mixed theme". Tokens in `src/app/globals.css`: `ground`, `surface`, `elevated`, `ink`,
`muted`, `gold`, `mint`, `orange`, `grey`, `on-color`; fonts `font-display` (Bebas Neue) and
`font-text` (EB Garamond), installed from npm so nothing loads from Google. Helper classes
`fit-heading`, `fit-wide`, `fit-greeting` size big headlines to the space they sit in.

Accessibility rules followed: colour is never the only signal (statuses are words, selected items say
"Selected"), errors are announced (`role="alert"`), visible focus, skip link, native `<dialog>` for
modals, 16px minimum text outside tiny legal lines, and no horizontal scrolling down to 320px.

## Next.js 16 notes

Cache Components is enabled (`cacheComponents` in `next.config.ts`). Anything that reads the request
(current path, route parameters, search parameters) must sit inside `<Suspense>`; the layouts and
dynamic pages already do. Signed-in and admin pages export `instant = false` because they render
behind the login guard. Bundled docs: `node_modules/next/dist/docs/`.
