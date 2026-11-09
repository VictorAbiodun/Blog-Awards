# Blog Award 2.0

A Nigerian music awards platform that celebrates upcoming and independent artists. Fans create an
account, top up prepaid voting credits, and vote for approved nominees. Administrators add and
manage every artist, season, category and winner. Artists do not log in.

**Status: the whole frontend is built.** Every screen from the Figma designs works, for phones and
computers, on fake data (demo mode). The backend is yours to connect: see
[docs/BACKEND-HANDOFF.md](./docs/BACKEND-HANDOFF.md). What is done and what is left is in
[CHECKLIST.md](./CHECKLIST.md); how the code is organised is in
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## What you need

- **Node.js 20.9 or newer** (developed on Node 22) and **npm**
- **Git**
- For the backend later: a free Supabase project, or the Supabase CLI with Docker

## Install and start

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

`npm run dev` starts in **demo mode** even without `.env.local`. Nothing else is needed to click
through the whole site.

## What to click (demo mode)

A banner at the top says "Demo mode" and has a **Reset demo data** button. All data lives in your
browser's local storage; nothing leaves your machine and no real money moves.

| Demo account | Email | Password |
| --- | --- | --- |
| Fan (has a wallet and a few votes) | `ada@example.com` | `password123` |
| Administrator | `admin@example.com` | `admin12345` |
| Disabled account | `disabled@example.com` | `password123` |

Try these:

1. **Sign up**: Register, then "Check your email". Click the demo button that stands in for the email link, then log in.
2. **Add credits**: Wallet, pick an amount, "Continue to secure checkout". A demo checkout lets you succeed or fail the payment. Credits appear only after success.
3. **Vote**: Nominees, open an artist, choose votes, confirm. You get a receipt and your balance drops.
4. **Edge cases**: ask for more votes than you can afford ("Not enough credits"); log out and open an artist ("Log in to vote"); as the admin, close voting and watch the fan side change to "Voting is closed".
5. **Admin**: log in as the administrator. Add and publish an artist (it appears on the public nominees page), change the vote price, issue a refund (a written reason is required), close voting, publish winners, export a report, read the audit log.

## Pages

| Area | Routes |
| --- | --- |
| Public | `/` (home), `/nominees`, `/nominees/[slug]`, `/leaderboard`, `/contact`, `/terms`, `/privacy`, `/refunds` |
| Accounts | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/check-email`, `/email-confirmed`, `/session-expired`, `/account-unavailable` |
| Signed in | `/dashboard`, `/wallet`, `/settings`, `/receipts/[id]` |
| Administrator | `/admin`, `/admin/artists`, `/admin/season`, `/admin/payments`, `/admin/suspicious`, `/admin/winners`, `/admin/audit` |

## Connecting your backend

Everything the screens need goes through one interface, `BlogAwardApi` (`src/services/api.ts`).
Demo mode implements it with fake data; **you implement it for real in
`src/services/backend-api.ts`**, then set `NEXT_PUBLIC_DEMO_MODE=false`. Until a method is
implemented, the screen that needs it says exactly which one. The handoff document lists every
method, the screens that use it, the security rules it must follow, a suggested database, and the
Paystack flow.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (demo mode on by default) |
| `npm run build` | Production build (needs no secrets) |
| `npm start` | Runs the production build (runs the safety checks, see below) |
| `npm run typecheck` | TypeScript in strict mode |
| `npm run lint` | ESLint |
| `npm test` | Unit and component tests (Vitest) |
| `npm run check` | typecheck + lint + tests. Run before every commit |

## Configuration

Settings live in `.env.local`, which Git ignores. `.env.example` is the documented template and
holds placeholders only. **Never put real keys in `.env.example`, in Git, or in a chat.**

| Variable | Use |
| --- | --- |
| `APP_ENV` | `development`, `test` or `production` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` for fake data and simulated payments; **must be `false` in production** |
| `NEXT_PUBLIC_APP_URL` | Public URL of the site |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe for the browser; Row Level Security protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses Row Level Security |
| `PAYMENTS_ENABLED`, `PAYMENT_PROVIDER`, `ALLOW_SIMULATED_PAYMENTS` | Payment switches. Keep payments off until approved |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` | `pk_test_` / `sk_test_` until you go live. The secret key is **server only** |

A secret must never sit in a `NEXT_PUBLIC_` variable, because those are sent to every visitor.

## Development mode and production mode

**The application refuses to start in production if the settings are dangerous**
(`src/lib/config/safety.ts`, run at server start by `src/instrumentation.ts`). For example,
production with demo mode on, simulated payments on, the mock provider, a test or placeholder key,
or a live key anywhere else, stops the server and lists every problem. `npm run build` also fails if
`APP_ENV=production` and demo mode is on. Set `NEXT_PUBLIC_DEMO_MODE=false` **before** building,
because `NEXT_PUBLIC_` values are baked in at build time.

## Database

`supabase/` holds the Supabase settings, migrations and pgTAP tests. Migration 1 creates fan
profiles with Row Level Security. Change the database only through new migration files.

```bash
npx supabase start && npx supabase db reset && npx supabase test db
```

## How this was tested

- **69 unit and component tests** (`npm test`): the production safety rules, the whole demo
  backend (ledger, voting, refunds, winners, CSV safety), validation, formatting, and form components.
- **92 browser checks** with a real Chromium (`scripts/e2e-demo-flows.py`): sign up, email
  confirmation, wrong password, wallet limits, failed and successful payments, voting, receipts, not
  enough credits, voting closed, admin guards, adding artists, refunds, winners, and no sideways
  scrolling on 16 pages at 320, 390 and 820 pixels wide. No console errors.
- `typecheck`, `lint` and `build` pass (29 routes).
- A production server with unsafe settings refuses to start; with safe settings it starts.
- Migration 1 and its 13 pgTAP tests pass on PostgreSQL 16 with a stand-in for Supabase's auth schema.

**Not yet run**: `supabase test db` against the real Supabase stack (needs Docker), any real
backend or payment (none exists yet), and testing on real phones and screen readers.

## Notes

- Artist names, standings, prices and ₦ amounts shown are **sample data**. The sample price is ₦50 per vote.
- `terms`, `privacy` and `refunds` are **drafts**. They say what is still undecided. Have a lawyer review them before taking real money.
- No artist photographs are included. Images come only from an administrator's upload.
