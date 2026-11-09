# Build checklist

Legend: [x] done and checked, [ ] still to do.

## Level 1: Foundation and architecture (complete)

- [x] Environment inspected; Next.js 16, React 19, strict TypeScript, Tailwind 4, ESLint
- [x] `.env.example` (placeholders only); secret files ignored by Git
- [x] Development and production modes with a production start guard (23 tests)
- [x] Supabase client helpers (browser, server, admin) and a safe `/api/health`
- [x] Design tokens, fonts (from npm), accessible base styles
- [x] Initial database configuration and migration 1 (`profiles`) with 13 pgTAP tests
- [x] README, architecture notes, this checklist
- [ ] Run `npx supabase test db` against the real local Supabase stack (needs Docker)

## Level 2: Visual design, navigation and user experience (complete, on demo data)

- [x] Brand design system from the Figma "mixed theme"
- [x] Homepage: hero, how voting works, nominees showcase, leaderboard, numbers, FAQ, closing panel, footer
- [x] Public header and footer with real links; mobile menu; skip link; visible focus
- [x] Registration, login, logout, forgot password, reset password, check email, email confirmed, session expired, account unavailable
- [x] Account settings: profile, change password, delete account (with confirmation)
- [x] Fan dashboard
- [x] Browse nominees (search, category filter, empty state) and nominee pages
- [x] Leaderboard page and winners
- [x] Contact page; terms, privacy and refund pages (**drafts**)
- [x] Loading, error and empty states everywhere; helpful error messages
- [x] Layouts checked at 320, 390, 820 and 1440 pixels
- [ ] Check with real phones and a screen reader

## Level 3: Database, authentication and administration

Frontend (done, on demo data):

- [x] Admin dashboard: overview, artists (add, edit, publish), season and rules, categories, payments, refunds with a required reason, suspicious activity, winners, reports, audit log
- [x] Route guards that send people somewhere helpful (a convenience only, not security)

Backend (yours; see docs/BACKEND-HANDOFF.md):

- [x] Migration 1: `profiles` with Row Level Security
- [ ] Roles controlled only by trusted server code
- [ ] Seasons, categories, artists, artist categories
- [ ] Wallets, append-only ledger (integer kobo), payments, votes, audit logs, flags, winners
- [ ] Constraints, transactions, balance derived from the ledger
- [ ] Authentication wired to Supabase; verified-account check before money operations; server-side checks on every method
- [ ] Secure bootstrap for the first administrator (never "first user wins")
- [ ] Tests proving one user cannot read or change another user's wallet
- [ ] Rate limits on sensitive actions

## Level 4: Wallet, Paystack funding and financial integrity

Frontend (done): wallet page, amounts, server-set limits, payment history, pending and failed states, return-from-provider check, fee and refund text.

Backend (yours):

- [ ] `startTopUp`, `getPaymentStatus`, `castVotes` (atomic RPC), refunds
- [ ] Paystack: initialise, verify, webhook signature check, idempotent crediting
- [ ] Balance reconciliation against the ledger
- [ ] Confirm with Paystack and advisers that a prepaid voting-credit wallet is permitted **before taking real money**
- [ ] Lawyer review of terms, privacy and refund policy

## Later

- [ ] Deployment, only after everything above is tested locally
- [ ] Playwright tests in the repo's own toolchain (the Python walk-through in `scripts/` covers the flows today)
