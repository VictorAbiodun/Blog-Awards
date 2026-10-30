# Build checklist

Legend: [x] done and checked, [ ] still to do.

## Level 1: Foundation and architecture (complete)

- [x] Inspect the environment (Node 22, npm 10, Git 2.43, empty directory)
- [x] Project initialised: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- [x] TypeScript strict mode on; ESLint configured and passing
- [x] `.env.example` with placeholders only; `.env.local` and other secret files ignored by Git
- [x] Development and production modes, with a production start guard (22 tests)
- [x] Supabase client helpers: browser, server (user-scoped), admin (service role, server only)
- [x] `/api/health` endpoint that never exposes secrets
- [x] Brand design tokens (colours, Bebas Neue and EB Garamond, focus styles)
- [x] Basic application shell: skip link, header, homepage hero, "how voting works", footer
- [x] Initial database configuration: `supabase/config.toml`, migration 1 (`profiles`), 13 pgTAP tests
- [x] README with install and start instructions
- [x] Development server runs; production build passes; no build errors
- [x] Documented directory structure (docs/ARCHITECTURE.md)

Known gaps inside Level 1 (see README, "How this was tested"):

- [ ] Run `npx supabase test db` against the real local Supabase stack (needs Docker)
- [ ] Add Playwright end-to-end tests (when there are flows to test)

## Level 2: Visual design, navigation and user experience

Designs exist in Figma for everything below; the code is not written yet.

- [x] Design tokens and fonts in code
- [x] Homepage hero and "how voting works" sections
- [ ] Homepage: featured nominees, categories, leaderboard, milestones, previous winners, rules, FAQ
- [ ] Footer links (contact, privacy, refund, terms) and the pages they point to
- [ ] Registration, login, logout, password reset, email confirmation screens
- [ ] Account profile and settings
- [ ] User dashboard
- [ ] Browse nominees (search and filters) and nominee page
- [ ] Mobile navigation, accessibility pass, loading and error states

## Level 3: Database, authentication and administration

- [x] Migration 1: `profiles` with Row Level Security
- [ ] Roles (fan, administrator) controlled only by trusted server code
- [ ] Award seasons, categories, artists, nominations
- [ ] Wallet accounts, append-only ledger (integer kobo), payment transactions, votes, audit logs
- [ ] Constraints, transactions, balance derived from the ledger
- [ ] Authentication, verified-account check before money operations, server-side route checks
- [ ] Admin dashboard (artists, seasons, categories, prices, payments, flags, winners, reports)
- [ ] Secure bootstrap for the first administrator (never "first user wins")
- [ ] Tests proving one user cannot read or change another user's wallet

## Level 4: Wallet, Paystack funding and financial integrity

- [ ] Wallet page, funding amounts with server-set limits
- [ ] Payment provider interface and a development-only mock adapter
- [ ] Paystack integration (initialise, verify, webhook signature check, idempotent crediting)
- [ ] Balance reconciliation against the ledger
- [ ] Confirm with Paystack and advisers that the prepaid-credit model is permitted before taking real money

## Later levels

- [ ] Voting flow, leaderboards, winners publication (from the spec levels after 4)
- [ ] Deployment (only after everything above is tested locally)
