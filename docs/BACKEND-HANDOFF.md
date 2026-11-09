# Backend handoff

The whole interface is finished and runs on fake data (demo mode). Your job is to make it run
on real data. **You only need to touch one file: `src/services/backend-api.ts`**, plus the
database and a few server routes it calls.

## How the interface gets its data

```
screens (src/components, src/app)
        │  call
        ▼
   api  (src/services/index.ts)  ──►  demoApi     src/services/demo/demo-api.ts     (fake, in the browser)
        │                         └─►  backendApi  src/services/backend-api.ts      (YOURS)
        ▼
   BlogAwardApi  (src/services/api.ts)  ← the contract: every method, input and output
```

- `src/services/api.ts` is the **contract**. Every method, its inputs, and the error codes.
- `src/types/domain.ts` holds the shapes of the data (`User`, `Artist`, `Season`, ...).
- `src/services/demo/demo-api.ts` shows the **intended behaviour** of every method. Read it as a
  worked example, and `demo-api.test.ts` as the specification.
- `backendApi` currently has every method returning "backend not connected" naming the method.
  Replace them one at a time. A screen whose method is not yet implemented shows that message
  instead of breaking.

To switch from demo to real: set `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local` and restart.
(In production it must be `false`; the server and the build refuse to run otherwise.)

**Where the code runs.** The interface calls `api.*` from the browser. So each `backendApi`
method is either a call to Supabase directly (reads that Row Level Security protects), or a
`fetch` to a server route you write (`src/app/api/.../route.ts`) for anything that needs a secret
or must be trusted (payments, votes, refunds, admin actions).

## The rules that matter most

1. **The server decides.** The interface hides buttons, but a hidden button is not security.
   Every method must re-check, on the server or in the database, who is asking and whether they
   may. `RequireAuth` only moves people around the interface.
2. **Money is integer kobo.** NGN 1,000 = `100000`. Never floats.
3. **Balances come from the ledger.** A wallet balance is the sum of that user's ledger entries
   (or a cached value updated atomically and reconciled against the ledger). Never trust a
   number sent from the browser.
4. **The ledger is append-only.** Credits are positive, debits negative. Corrections are new
   entries, never edits.
5. **Only a verified payment creates credits**, and exactly once (idempotency key on the payment
   reference). A browser redirect is never proof of payment.
6. **A vote and its wallet debit succeed or fail together**: one database transaction.
7. **Administrator actions are audited**, with who, what and (for money) the written reason.
8. **Secrets stay on the server.** The service role key and the Paystack secret key never go in a
   `NEXT_PUBLIC_` variable or a client component.
9. Never put passwords, secret keys or card data in logs or reports.

## Method by method

Errors: throw `new ApiError(code, message)` (from `src/services/api.ts`). The `message` is shown
to the person, so make it plain and helpful. Codes the screens react to are in the last section.

### Accounts

| Method | Screens | What it must do |
| --- | --- | --- |
| `getSession()` | every page (header, route guard) | Return `signedIn` with the `User` (including `role`, `emailConfirmed`, `status`), or `signedOut`, `expired` (had a session that ended) or `unavailable` (account disabled or deleted). Supabase: `auth.getUser()` + the `profiles` row (+ role). |
| `register({displayName,email,password})` | Register | Create the account, send the confirmation email, **do not sign in**. Return `{ email }`. Supabase: `auth.signUp` with `options.data.display_name` (migration 1 turns that into the profile). Email confirmation is already required in `supabase/config.toml`. |
| `login({email,password})` | Log in | Return the `User`. Throw `invalid_credentials` (same message for wrong email or password), `email_not_confirmed`, `account_unavailable`. Supabase: `auth.signInWithPassword`, then check `profiles.account_status`. |
| `logout()` | Log out | End the session. |
| `requestPasswordReset(email)` | Forgot password | Send the reset email. **Always succeed**, so the answer never reveals whether an account exists. Supabase: `auth.resetPasswordForEmail` with a redirect to `/reset-password`. |
| `completePasswordReset({newPassword})` | Reset password | The reset link signs the person in to a recovery session; set the new password. Supabase: `auth.updateUser({ password })`. |
| `resendConfirmation(email)` | Check your email | Resend the confirmation email. Supabase: `auth.resend({ type: "signup", email })`. |
| `updateProfile({displayName})` | Settings | Update `profiles.display_name` (RLS already limits this to the owner). |
| `changePassword({currentPassword,newPassword})` | Settings | Re-check the current password, then set the new one. |
| `deleteAccount()` | Settings | Delete the auth user from a **server route** using the admin client (`src/lib/supabase/admin.ts`); the profile deletes by cascade. Decide what happens to the wallet and ledger (see the refund policy). |

### Public catalogue

| Method | Screens | Notes |
| --- | --- | --- |
| `getSeason()` | many | The current `Season`. `showVoteCounts` controls whether totals are shown anywhere. |
| `listCategories()` | browse, forms | All categories. |
| `listArtists()` | home, browse | **Published artists only.** Draft artists must never reach the public (RLS). |
| `getArtist(slug)` | nominee page | A published artist, or `null`. |
| `getLeaderboard()` | home, leaderboard | Published artists ranked by votes. If `showVoteCounts` is false, either return `votes: 0` or hide totals server-side. |
| `listWinners()` | leaderboard | Published winners only. |
| `sendContactMessage(input)` | Contact | Store or email the message. Rate-limit it. |

### Signed-in fan

| Method | Screens | Notes |
| --- | --- | --- |
| `getDashboard()` | Dashboard | One call that returns everything the page shows (see `DashboardData`). |
| `getWallet()` | Wallet, header balance, vote panel | Balance from the ledger, the fan's own payments and vote receipts. |
| `startTopUp(amountKobo)` | Wallet | Check the amount against the season's min and max **on the server**, require a confirmed email, create a `pending` payment with a unique reference, call Paystack to initialise a transaction, and return `{ kind: "redirect", reference, url }`. |
| `getPaymentStatus(reference)` | Wallet (after the provider redirects back to `/wallet?reference=...`) | Return the payment's real status from your database. Only the webhook or a server-side verification changes it. |
| `castVotes({artistSlug,votes})` | Nominee page | One transaction: check signed in, email confirmed, account active, season open, category open, `1 <= votes <= 100`, balance >= cost; insert the ledger debit, the vote and the tally update; return the `VoteReceipt`. Do this as a Postgres function (RPC) so it is atomic. |
| `getReceipt(id)` | Receipt | Only the owner's receipt, else `not_found`. |

### Administrator (every method must check the caller is an administrator)

| Method | Screens | Notes |
| --- | --- | --- |
| `getAdminOverview()` | Admin overview | Totals, counts, last few audit entries. |
| `listAdminArtists()` / `saveArtist(input)` | Admin artists | Includes drafts. `saveArtist` creates or updates (when `id` is set), generates a unique `slug`, writes an audit entry. **Image:** the interface sends `imageUrl` as a small data URL (under 150 KB). In your implementation upload it to Supabase Storage, validate type and size, and store the path. |
| `getAdminSeason()` / `saveSeasonSettings()` / `setVotingStatus()` | Season and rules | Validate prices and limits (whole kobo above zero, min <= max, close after open). Changing the price bumps `rulesVersion`. All audited. |
| `addCategory()` / `setCategoryStatus()` | Season and rules | Audited. |
| `listAdminPayments()` | Payments | All payments with a fan label. |
| `issueRefund({paymentId,reason})` | Payments | Require a reason of 10+ characters, only `verified` payments, only once; write a `refund` ledger entry and an audit entry containing the reason. Refuse if the fan has already spent the credits. |
| `listFlags()` / `reviewFlag()` | Payments, Suspicious activity | Flags come from your own checks (for example, very fast voting, repeated failed payments). |
| `listAudit()` | Audit log | Newest first. |
| `listAdminWinners()` / `publishWinner(categoryId)` | Winners | Publishing only after voting is `closed`. |
| `exportReport(kind)` | Winners and reports | Return CSV text. Neutralise cells that start with `=`, `+`, `-`, `@` (see `csvCell` in demo-api). Never include secrets or card data. |

## Suggested database (extends migration 1)

Create each as a **new migration file** in `supabase/migrations/`, with Row Level Security on and
explicit grants (`auto_expose_new_tables = false` is already set, so nothing is exposed by default).

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | (exists) | Add a role. Better: a separate `user_roles(user_id, role)` that only the service role can write, so a fan can never promote themselves. |
| `seasons` | name, voting_status, vote_price_kobo, min/max_top_up_kobo, rules_version, voting_opens_at, voting_closes_at, show_vote_counts | One current season. Check `voting_opens_at < voting_closes_at`. |
| `categories` | season_id, name, description, eligibility, status | |
| `artists` | slug (unique), name, bio, image_path, music_url, social_url, status | No owner: artists do not log in. Public can read `published` only. |
| `artist_categories` | artist_id, category_id | Unique pair. |
| `wallets` | user_id (unique), currency `NGN`, status | One wallet per fan, enforced by a unique constraint. |
| `wallet_ledger` | wallet_id, entry_type, amount_kobo (signed integer), related_id, idempotency_key (unique), description, created_by | **Append-only**: no update or delete grants, plus a trigger that raises on update/delete. |
| `payments` | reference (unique), user_id, wallet_id, amount_kobo (> 0), currency, status, verification_status, provider_meta, verified_at | Fans can read their own; only server code writes. |
| `votes` | user_id, artist_id, category_id, season_id, votes (> 0), price_kobo, total_kobo, ledger_entry_id, status | Linked to its ledger debit. |
| `flags`, `audit_logs`, `announcements`, `winners` | see `domain.ts` | `audit_logs` is append-only too. |

Test the security rules the same way migration 1 is tested: pgTAP files in
`supabase/tests/database/` (`supabase test db`). The spec's key test: **one fan cannot read or
modify another fan's wallet or ledger.**

## Paystack

Use Paystack's current official documentation for exact endpoints and fields. The shape of the flow:

1. `startTopUp` (server route): validate amount, create a `pending` payment with a unique reference,
   initialise the transaction with the **secret key**, return the checkout URL. Set the callback URL to
   `/wallet?reference=<reference>`.
2. The fan pays on Paystack's page and returns to `/wallet?reference=...`. The page shows
   "checking your payment" and polls `getPaymentStatus`.
3. **Webhook route** (`src/app/api/webhooks/paystack/route.ts`): verify the `x-paystack-signature`
   header (HMAC-SHA512 of the raw body, keyed with the secret key) before trusting anything. Then
   confirm reference, amount and currency match your pending payment, and in **one idempotent
   transaction** mark it verified and insert the credit ledger entry. Handle duplicate and
   out-of-order events. Respond with a retryable error code on failure.
4. Optionally also verify server-side with Paystack's verify-transaction endpoint when the fan returns.
5. Keep `PAYMENTS_ENABLED=false` until you have confirmed with Paystack and an adviser that a
   prepaid voting-credit wallet is permitted. Use `sk_test_` keys until then. The server refuses to
   start if a live key is used outside production (see `src/lib/config/safety.ts`).

## Error codes the screens react to

| Code | Where the interface reacts |
| --- | --- |
| `not_signed_in` | Vote panel asks them to log in. The route guard redirects. |
| `invalid_credentials` | Log in shows the error. |
| `email_not_confirmed` | Log in, wallet and vote panel link to "Check your email". |
| `email_taken` | Register shows the error. |
| `insufficient_credits` | Vote panel shows "Not enough credits" with Add credits. |
| `voting_closed` | Vote panel switches to "Voting is closed". |
| `account_unavailable` | Redirects to the account-unavailable page. |
| `amount_out_of_range` | Wallet shows the limits. |
| `forbidden`, `not_found`, `validation` | Shown as a plain message. |
| `backend_not_connected` | Shown while a method is not implemented yet. |

## How to check your work

- Run the interface against your backend, then walk the flows in the README ("What to click").
- Port the assertions in `src/services/demo/demo-api.test.ts` to run against `backendApi`
  (with a test database). They describe the behaviour every method must have.
- `scripts/e2e-demo-flows.py` is a browser walk-through of every flow (demo mode only).
