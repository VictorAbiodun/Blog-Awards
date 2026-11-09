-- Blog Award 2.0 - migration 4: wallets, append-only ledger, payments, and votes
--
-- Non-negotiable financial invariants:
--   * Money is ALWAYS integer kobo (100 kobo = NGN 1).
--   * Append-only ledger: records in wallet_ledger are immutable.
--   * Balances are derived from the sum of ledger entries.
--   * Row Level Security: fans can inspect only their own wallets, ledger rows,
--     payments, and votes.

-- 1. Wallets
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  currency text not null default 'NGN'
    constraint wallets_currency_ngn check (currency = 'NGN'),
  status text not null default 'active'
    constraint wallets_status_valid check (status in ('active', 'frozen', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wallets is
  'One wallet per user account. Balances are derived from wallet_ledger.';

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- Automatically create a wallet for new users
create or replace function public.handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wallets (user_id, currency, status)
  values (new.id, 'NGN', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_wallet() from public, anon, authenticated;

create trigger on_auth_user_created_wallet
  after insert on auth.users
  for each row execute function public.handle_new_user_wallet();

-- 2. Wallet Ledger (APPEND-ONLY)
create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  entry_type text not null
    constraint wallet_ledger_type_valid check (entry_type in ('top_up', 'vote_debit', 'refund', 'adjustment')),
  amount_kobo integer not null
    constraint wallet_ledger_amount_non_zero check (amount_kobo <> 0),
  related_id text,
  idempotency_key text unique,
  description text not null
    constraint wallet_ledger_desc_length check (char_length(description) between 1 and 200),
  created_at timestamptz not null default now()
);

comment on table public.wallet_ledger is
  'Append-only financial ledger. Credits are positive, debits negative. Updates and deletes are prohibited.';

-- Immutability trigger: prevent any UPDATE or DELETE on wallet_ledger
create or replace function public.prohibit_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'wallet_ledger is strictly append-only: updates and deletes are prohibited.';
end;
$$;

create trigger tr_protect_wallet_ledger_immutability
  before update or delete on public.wallet_ledger
  for each row execute function public.prohibit_ledger_mutation();

-- 3. Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    constraint payments_reference_length check (char_length(reference) between 8 and 100),
  user_id uuid not null references auth.users (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete restrict,
  amount_kobo integer not null
    constraint payments_amount_positive check (amount_kobo > 0),
  currency text not null default 'NGN'
    constraint payments_currency_ngn check (currency = 'NGN'),
  status text not null default 'pending'
    constraint payments_status_valid check (status in ('pending', 'verified', 'failed', 'refunded')),
  provider text not null default 'paystack'
    constraint payments_provider_valid check (provider in ('paystack', 'mock', 'demo')),
  provider_meta jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- 4. Votes
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique,
  user_id uuid not null references auth.users (id) on delete restrict,
  artist_id uuid not null references public.artists (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  season_id uuid not null references public.seasons (id) on delete restrict,
  votes integer not null
    constraint votes_count_range check (votes between 1 and 100),
  price_kobo integer not null
    constraint votes_price_positive check (price_kobo > 0),
  total_kobo integer not null,
  ledger_entry_id uuid not null references public.wallet_ledger (id) on delete restrict,
  status text not null default 'confirmed'
    constraint votes_status_valid check (status in ('confirmed', 'voided')),
  created_at timestamptz not null default now(),
  constraint votes_total_math check (total_kobo = votes * price_kobo)
);

-- Row Level Security
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.votes enable row level security;

-- Grants
revoke all on public.wallets from anon, authenticated;
revoke all on public.wallet_ledger from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.votes from anon, authenticated;

grant select on public.wallets to authenticated;
grant select on public.wallet_ledger to authenticated;
grant select on public.payments to authenticated;
grant select on public.votes to authenticated;

grant select, insert, update, delete on public.wallets to service_role;
grant select, insert, update, delete on public.wallet_ledger to service_role;
grant select, insert, update, delete on public.payments to service_role;
grant select, insert, update, delete on public.votes to service_role;

-- Policies:
-- Wallets: user reads own wallet; admin reads all
create policy "Users can read their own wallet, admins can read all"
  on public.wallets for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- Ledger: user reads own ledger entries; admin reads all
create policy "Users can read their own ledger entries, admins can read all"
  on public.wallet_ledger for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- Payments: user reads own payments; admin reads all
create policy "Users can read their own payments, admins can read all"
  on public.payments for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- Votes: user reads own votes; admin reads all
create policy "Users can read their own votes, admins can read all"
  on public.votes for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

