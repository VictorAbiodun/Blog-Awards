# Blog Award 2.0

A Nigerian music awards platform that celebrates upcoming and independent artists.
Fans create an account, top up prepaid voting credits, and vote for approved nominees.
Administrators add and manage every artist, season, category and winner.

This repository is built in stages. See [CHECKLIST.md](./CHECKLIST.md) for exactly what is
finished and what is still to do, and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how
the code is organised and why.

**Current stage: Level 1 (foundation) is complete.** The public homepage shell runs. Accounts,
the wallet, voting and payments are not built yet, and nothing on the site pretends otherwise.

## What you need

- **Node.js 20.9 or newer** (developed on Node 22) and **npm**
- **Git**
- For the database (optional until Level 3): either a free Supabase project, or the
  [Supabase CLI](https://supabase.com/docs/guides/local-development) with Docker for a local copy

## Install and start

```bash
npm install
cp .env.example .env.local     # then edit .env.local (see below)
npm run dev                    # http://localhost:3000
```

The homepage works with no Supabase settings at all. You only need them once accounts arrive.

Check that the server is happy: open <http://localhost:3000/api/health>. It reports the
environment and any configuration problems, and never shows a secret.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (needs no secrets) |
| `npm start` | Runs the production build (runs the safety checks, see below) |
| `npm run typecheck` | TypeScript in strict mode |
| `npm run lint` | ESLint |
| `npm test` | Unit and component tests (Vitest) |
| `npm run check` | typecheck + lint + tests together. Run before every commit |

## Configuration

Every setting lives in `.env.local`, which is **ignored by Git**. `.env.example` is the
documented template and contains placeholders only. **Never put real keys in `.env.example`,
in Git, or in a chat.**

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `APP_ENV` | server | `development`, `test` or `production` |
| `NEXT_PUBLIC_APP_URL` | browser + server | Public URL of the site |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Safe to expose, Row Level Security protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses Row Level Security |
| `PAYMENTS_ENABLED` | server | Master switch, keep `false` until approved |
| `PAYMENT_PROVIDER` | server | `disabled`, `mock` or `paystack` |
| `ALLOW_SIMULATED_PAYMENTS` | server | Must be `false` in production |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | browser + server | `pk_test_...` until you go live |
| `PAYSTACK_SECRET_KEY` | **server only** | `sk_test_...` until you go live |

A secret must never sit in a variable that starts with `NEXT_PUBLIC_`, because those are sent to
every visitor. The safety checks below catch this mistake.

## Development mode and production mode

| | Development | Production |
| --- | --- | --- |
| Money | No real financial activity | Real credits only after a verified payment or an authorised admin adjustment |
| Payments | Simulated funding (`mock` provider, from Level 4) | Simulated payments disabled |
| Paystack | Off, or test keys only | Off until explicitly approved and configured |
| Data | Free local database, seeded demo data | Real accounts, persistent database |

**The application refuses to start in production if the settings are dangerous.** The rules live
in `src/lib/config/safety.ts` and run at server start (`src/instrumentation.ts`). For example,
`APP_ENV=production` with `ALLOW_SIMULATED_PAYMENTS=true` stops the server and prints every
problem. A server counts as production if *either* `NODE_ENV` or `APP_ENV` says so, so running a
production build with `APP_ENV=development` does not bypass the checks.

To try a production build locally you must give it a complete, safe production configuration
(https URLs, real Supabase values, simulated payments off). That is deliberate.

## Database (Supabase / PostgreSQL)

- `supabase/config.toml`: local Supabase settings (email confirmation required, passwords of at
  least 8 characters, new tables not exposed to the API unless explicitly granted).
- `supabase/migrations/`: the schema. **Always change the database through a new migration file,
  never by clicking in the dashboard.**
- `supabase/tests/database/`: pgTAP tests for the security rules.

Local copy (needs Docker):

```bash
npx supabase start        # starts a local Supabase
npx supabase db reset     # applies every migration
npx supabase test db      # runs the pgTAP tests
```

Hosted project: link it with `npx supabase link`, then `npx supabase db push`.

Migration 1 creates `profiles`: one row per fan, created automatically when an account is made.
A fan can read and edit only their own display name and avatar. They cannot read other fans'
profiles, change their account status, or insert or delete profiles.

## Security rules this project follows

- Secrets stay on the server. `src/lib/config/server-env.ts` and the admin Supabase client import
  `server-only`, so importing them from a browser component fails the build.
- The service role key is used only in trusted server code (`src/lib/supabase/admin.ts`).
- Row Level Security is switched on for every table that holds user data, with explicit grants.
- Money is stored as integer kobo, never as floating-point numbers (from Level 3).
- A browser redirect is never proof of payment (from Level 4).

## How this was tested

Run in the build environment:

- 26 unit and component tests pass (`npm test`): 22 for the configuration safety rules, 4 for the homepage.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.
- A production server was started with simulated payments on: it **refused to start** and listed
  every problem. With safe settings it started and answered `/` and `/api/health`.
- The homepage was loaded in a real browser at 320, 390, 820 and 1440 pixels wide with no
  sideways scrolling and both brand fonts loaded.
- Migration 1 and its 13 pgTAP tests pass on PostgreSQL 16, using a stand-in for Supabase's `auth`
  schema.

**Not yet run** (needs your machine, Docker or accounts): `supabase start` and `supabase test db`
against the real Supabase stack, a real Supabase project, and browser end-to-end tests (Playwright).
Treat the migration as tested in principle, and run `npx supabase test db` yourself before relying on it.
