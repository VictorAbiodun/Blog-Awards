<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Developer & AI Agent Guidelines

Welcome to **Blog Award 2.0**. This document contains critical guidelines, architecture contracts, commands, and invariants that every agent and contributor must follow when working on this repository.

---

## 1. Quick Start & Running the Project

### Prerequisites
- **Node.js**: >= 20.9.0 (tested on Node 22)
- **npm**: 10+
- **Platform**: Windows / Linux / macOS

### Setup & Local Dev
```bash
# 1. Install dependencies
npm install

# 2. Configure environment (creates local env with demo mode enabled)
cp .env.example .env.local

# 3. Start development server
npm run dev
# The application runs at http://localhost:3000
```

> **Note on Demo Mode**: By default, `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`. The app runs completely in the browser using an in-memory/localStorage mock store (`src/services/demo/`). You do not need Docker, Supabase, or Paystack credentials to run and test the full user flow.

---

## 2. Core Architectural Principles & Invariants

Always respect these non-negotiable rules:

1. **The Seam (`BlogAwardApi`)**:
   - The UI components (`src/app/`, `src/components/`) NEVER call Supabase, Paystack, or databases directly.
   - All data fetching and actions go through `api` imported from `src/services/index.ts`.
   - `src/services/api.ts` defines the contract (`BlogAwardApi`).
   - `src/services/demo/` contains the in-browser demo implementation.
   - `src/services/backend-api.ts` is where real backend calls and Supabase/server endpoints are implemented.

2. **Money is ALWAYS Integer Kobo**:
   - All monetary values are represented as whole integer kobo (1 NGN = 100 kobo). NGN 1,000 = `100000`.
   - Never use floating point math for currency.

3. **Append-Only Wallet Ledger**:
   - Wallet balances are computed by summing ledger entries (`wallet_ledger`).
   - Never mutate or delete ledger records. Corrections must be new balancing entries.
   - A vote and its corresponding debit must happen atomically in a single database transaction.

4. **Security & Production Start Guard**:
   - The application has strict startup safety checks defined in `src/lib/config/safety.ts` (executed via `src/instrumentation.ts`).
   - In `APP_ENV=production`, startup will fail if `NEXT_PUBLIC_DEMO_MODE=true`, if mock payment providers are selected, or if test/placeholder keys are present.
   - Never prefix server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`) with `NEXT_PUBLIC_`.

5. **Server Authority**:
   - Client-side checks and `RequireAuth` guards are purely for UX and navigation convenience.
   - All business logic, vote limits, email verification checks, and administrative permissions must be strictly verified on the server or via PostgreSQL Row Level Security (RLS).

---

## 3. Project Structure

```
blog-award-2/
├── .env.example              # Documented configuration template
├── docs/
│   ├── ARCHITECTURE.md       # High-level architecture and design system
│   └── BACKEND-HANDOFF.md    # Method-by-method backend requirements
├── src/
│   ├── app/                  # Next.js App Router (public, auth, member, admin, api)
│   ├── components/           # UI and domain components (ui, home, artists, auth, member, admin)
│   ├── hooks/                # session, use-async
│   ├── lib/                  # config, supabase clients, validation (Zod), formatters
│   ├── services/             # The Seam (api.ts, backend-api.ts, demo/)
│   ├── types/                # Domain models (domain.ts)
│   └── instrumentation.ts    # Server startup environment guards
├── supabase/                 # Supabase configuration, migrations, pgTAP tests
└── tests/                    # Vitest setup and tests
```

---

## 4. Verification & Quality Gates

Run these commands before finishing any task:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run development server (accessible at `localhost:3000`) |
| `npm run typecheck` | Run Next.js route typegen and strict TypeScript checking |
| `npm run lint` | ESLint verification |
| `npm test` | Run Vitest suite (69+ tests covering safety, demo API, formatters, validation) |
| `npm run check` | Runs typecheck + lint + test sequentially |
| `npm run build` | Verifies Next.js production compilation |

---

## 5. Next.js 16 Conventions

- **Next.js 16.4.3 & React 19**: Cache Components is enabled (`cacheComponents` in `next.config.ts`).
- Components reading search parameters, headers, or route path dynamic data must be wrapped in `<Suspense>`.
- Client components require the `"use client"` directive at the very top.
- Server-only code must import `"server-only"`.
