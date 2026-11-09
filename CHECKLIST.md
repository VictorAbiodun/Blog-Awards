# Build checklist

Legend: [x] done and checked, [ ] still to do.

## Level 0: Local Environment & Verification (complete)

- [x] Node.js dependencies installed (`node_modules` cleanly built with Next.js 16.4.3 & React 19)
- [x] `.env.local` created from `.env.example` with `NEXT_PUBLIC_DEMO_MODE=true`
- [x] Windows native tooling configured (`@rolldown/binding-win32-x64-msvc` installed for test runner)
- [x] TypeScript validation passing (`npm run typecheck` — 0 errors)
- [x] Code style and linting passing (`npm run lint` — 0 errors, 0 warnings)
- [x] Automated test suite passing (`npm test` — 69/69 tests passing across 6 test files)
- [x] Dev server tested and verified (`npm run dev` boots Turbopack and serves HTTP 200 on `http://localhost:3000`)
- [x] Agent instructions updated and documented in `AGENTS.md`

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
- [x] Nominee voting panel: preset tiles (1, 3, 5, 10), custom vote entry (1–100), real-time credit check, insufficient credit warning with shortfall calculation, auto-tallying ("Choose fewer votes", "Use max affordable"), confirmation dialog and receipts
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

- [x] Migration 1: `profiles` with Row Level Security (applied to remote)
- [x] Migration 2: `user_roles` controlled strictly by trusted server code (fan/admin RLS) (applied to remote)
- [x] Migration 3: `seasons`, `categories`, `artists`, `artist_categories`, `winners` (RLS for public vs admin) (applied to remote)
- [x] Migration 4: `wallets`, append-only `wallet_ledger` (integer kobo, immutable trigger), `payments`, `votes` (applied to remote)
- [x] Migration 5: `audit_logs` (append-only trigger), `flags`, `announcements` (applied to remote)
- [x] Migration 6: Atomic database RPC functions (`cast_votes` transaction, `get_wallet_balance` ledger sum) (applied to remote)
- [x] Migration 7: Inaugural season and starter categories seed (applied to remote)
- [x] Migration 8: PostgREST foreign key joins for `audit_logs`, `payments`, `flags` to `profiles` (applied to remote)
- [x] Authentication & backend API implemented in `src/services/backend-api.ts` connecting Supabase
- [x] Secure server routes for admin management, account deletion, and refunds with required reason
- [x] Live deployment verified on Vercel and local dev environment
- [ ] Tests proving one user cannot read or change another user's wallet (local pgTAP with Docker)
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
