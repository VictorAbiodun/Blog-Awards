-- Blog Award 2.0 - migration 1: fan profiles
--
-- A profile holds the friendly, non-secret details of one fan. Credentials stay
-- in Supabase Auth (auth.users) and are never copied here.
--
-- Security rules in this migration:
--   * Row Level Security is on. A fan can read and edit only their own row.
--   * A fan can change display_name and avatar_path and nothing else, so they
--     cannot re-enable a disabled account.
--   * Nobody can insert or delete profiles through the API. Profiles are created
--     by a trigger when an account is created, and removed when the auth user is
--     deleted.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    constraint profiles_display_name_length check (char_length(display_name) between 1 and 60),
  avatar_path text
    constraint profiles_avatar_path_length check (avatar_path is null or char_length(avatar_path) <= 300),
  account_status text not null default 'active'
    constraint profiles_account_status_valid check (account_status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per fan account. Display details only; credentials live in auth.users.';
comment on column public.profiles.display_name is
  'A friendly name for the fan. It is not a public username.';
comment on column public.profiles.account_status is
  'active or disabled. Changed only by trusted server-side code using the service role.';

-- Keep updated_at honest.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a Supabase Auth account is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Fan'), 60)
  );
  return new;
end;
$$;

-- The function runs only from the trigger below, never from the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security.
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy "Fans can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Fans can update their own profile while the account is active"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id and account_status = 'active')
  with check ((select auth.uid()) = id);
-- Blog Award 2.0 - migration 2: user roles and administrator security
--
-- Roles are strictly separated from fan profiles and credentials.
-- Only trusted server-side code (service_role) can assign or elevate roles.
-- Fans can never promote themselves.

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'fan'
    constraint user_roles_role_valid check (role in ('fan', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_roles is
  'User authorization roles. Managed strictly by the service role; fans can only read their own role.';
comment on column public.user_roles.role is
  'fan or admin. Elevated only by trusted server code or database administrators.';

-- Trigger for updated_at on user_roles
create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- Security definer function to check if a user is an administrator
create or replace function public.is_admin(p_user_id uuid default null)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  check_id uuid;
  user_role text;
begin
  check_id := coalesce(p_user_id, (select auth.uid()));
  if check_id is null then
    return false;
  end if;

  select role into user_role
  from public.user_roles
  where user_id = check_id;

  return user_role = 'admin';
end;
$$;

comment on function public.is_admin is
  'Returns true if the caller (or specified user_id) is an administrator.';

-- Automatically create a default 'fan' role for every new user
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'fan')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_role() from public, anon, authenticated;

create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- Row Level Security
alter table public.user_roles enable row level security;

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.user_roles to service_role;
grant execute on function public.is_admin(uuid) to authenticated, anon;

-- Fans can read their own role. Administrators can read all roles.
create policy "Users can read their own role or admins can read all"
  on public.user_roles
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
-- Blog Award 2.0 - migration 3: public catalogue and nominee management
--
-- Tables:
--   * seasons: voting rules, dates and price settings
--   * categories: award categories associated with a season
--   * artists: nominees with biographies, links, media, and published vote tallies
--   * artist_categories: many-to-many relationship linking artists to categories
--   * winners: award winners per category

-- 1. Seasons
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint seasons_name_length check (char_length(name) between 1 and 100),
  voting_status text not null default 'open'
    constraint seasons_voting_status_valid check (voting_status in ('open', 'closed')),
  vote_price_kobo integer not null
    constraint seasons_vote_price_positive check (vote_price_kobo > 0),
  min_top_up_kobo integer not null
    constraint seasons_min_top_up_positive check (min_top_up_kobo > 0),
  max_top_up_kobo integer not null,
  rules_version integer not null default 1
    constraint seasons_rules_version_positive check (rules_version >= 1),
  voting_opens_at timestamptz,
  voting_closes_at timestamptz,
  show_vote_counts boolean not null default false,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_limits_ordered check (max_top_up_kobo >= min_top_up_kobo),
  constraint seasons_voting_dates_valid check (
    voting_opens_at is null or voting_closes_at is null or voting_opens_at < voting_closes_at
  )
);

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();

-- 2. Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null
    constraint categories_name_length check (char_length(name) between 1 and 60),
  description text not null
    constraint categories_description_length check (char_length(description) between 1 and 300),
  eligibility text not null
    constraint categories_eligibility_length check (char_length(eligibility) between 1 and 300),
  status text not null default 'open'
    constraint categories_status_valid check (status in ('open', 'closed')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- 3. Artists
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint artists_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 100),
  name text not null
    constraint artists_name_length check (char_length(name) between 1 and 80),
  bio text not null default ''
    constraint artists_bio_length check (char_length(bio) <= 1200),
  image_path text
    constraint artists_image_path_length check (image_path is null or char_length(image_path) <= 300),
  music_url text
    constraint artists_music_url_length check (music_url is null or char_length(music_url) <= 300),
  social_url text
    constraint artists_social_url_length check (social_url is null or char_length(social_url) <= 300),
  status text not null default 'draft'
    constraint artists_status_valid check (status in ('draft', 'published')),
  votes integer not null default 0
    constraint artists_votes_non_negative check (votes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

-- 4. Artist Categories (junction)
create table public.artist_categories (
  artist_id uuid not null references public.artists(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artist_id, category_id)
);

-- 5. Winners
create table public.winners (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint winners_unique_category unique (season_id, category_id)
);

-- Row Level Security
alter table public.seasons enable row level security;
alter table public.categories enable row level security;
alter table public.artists enable row level security;
alter table public.artist_categories enable row level security;
alter table public.winners enable row level security;

-- Permissions
revoke all on public.seasons from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.artists from anon, authenticated;
revoke all on public.artist_categories from anon, authenticated;
revoke all on public.winners from anon, authenticated;

grant select on public.seasons to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.artists to anon, authenticated;
grant select on public.artist_categories to anon, authenticated;
grant select on public.winners to anon, authenticated;

grant select, insert, update, delete on public.seasons to service_role;
grant select, insert, update, delete on public.categories to service_role;
grant select, insert, update, delete on public.artists to service_role;
grant select, insert, update, delete on public.artist_categories to service_role;
grant select, insert, update, delete on public.winners to service_role;

-- Policies:
-- Seasons: public can view. Admins can update.
create policy "Anyone can read seasons"
  on public.seasons for select
  using (true);

create policy "Admins can insert seasons"
  on public.seasons for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update seasons"
  on public.seasons for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Categories: public can view. Admins can manage.
create policy "Anyone can read categories"
  on public.categories for select
  using (true);

create policy "Admins can insert categories"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update categories"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Artists: public can only read published artists. Admins can read all and manage.
create policy "Public can read published artists, admins can read all"
  on public.artists for select
  using (status = 'published' or public.is_admin());

create policy "Admins can insert artists"
  on public.artists for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update artists"
  on public.artists for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete artists"
  on public.artists for delete
  to authenticated
  using (public.is_admin());

-- Artist Categories
create policy "Anyone can read artist categories for published artists or admins all"
  on public.artist_categories for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id and (a.status = 'published' or public.is_admin())
    )
  );

create policy "Admins can manage artist categories"
  on public.artist_categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Winners: public can read published winners only. Admins can manage.
create policy "Public can read published winners, admins all"
  on public.winners for select
  using (published_at is not null or public.is_admin());

create policy "Admins can manage winners"
  on public.winners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
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
-- Blog Award 2.0 - migration 5: audit logs, suspicious flags, and announcements
--
-- Security and compliance invariants:
--   * audit_logs is strictly append-only: updates and deletes are prohibited.
--   * Financial changes (e.g. refunds) require a written reason.
--   * Flags and audit entries are viewable only by administrators.

-- 1. Audit Logs (APPEND-ONLY)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  action text not null
    constraint audit_logs_action_length check (char_length(action) between 2 and 80),
  entity_type text not null
    constraint audit_logs_entity_type_length check (char_length(entity_type) between 2 and 60),
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  reason text
    constraint audit_logs_reason_length check (reason is null or char_length(reason) >= 10),
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only record of administrator and financial actions. Updates and deletes are prohibited.';

-- Immutability trigger for audit_logs
create or replace function public.prohibit_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is strictly append-only: updates and deletes are prohibited.';
end;
$$;

create trigger tr_protect_audit_logs_immutability
  before update or delete on public.audit_logs
  for each row execute function public.prohibit_audit_mutation();

-- 2. Flags (Suspicious activity monitoring)
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  flag_type text not null
    constraint flags_type_length check (char_length(flag_type) between 2 and 60),
  severity text not null default 'medium'
    constraint flags_severity_valid check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null
    constraint flags_description_length check (char_length(description) between 5 and 500),
  status text not null default 'pending'
    constraint flags_status_valid check (status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger flags_set_updated_at
  before update on public.flags
  for each row execute function public.set_updated_at();

-- 3. Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons (id) on delete cascade,
  title text not null
    constraint announcements_title_length check (char_length(title) between 2 and 120),
  body text not null
    constraint announcements_body_length check (char_length(body) between 5 and 2000),
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.audit_logs enable row level security;
alter table public.flags enable row level security;
alter table public.announcements enable row level security;

-- Grants
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.flags from anon, authenticated;
revoke all on public.announcements from anon, authenticated;

grant select on public.announcements to anon, authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.flags to authenticated;

grant select, insert, update, delete on public.audit_logs to service_role;
grant select, insert, update, delete on public.flags to service_role;
grant select, insert, update, delete on public.announcements to service_role;

-- Policies:
-- Announcements: public can view published; admins manage
create policy "Public can read published announcements, admins all"
  on public.announcements for select
  using (published_at is not null or public.is_admin());

create policy "Admins can manage announcements"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Audit logs: readable by admins only
create policy "Admins can read audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

-- Flags: readable and updatable by admins only
create policy "Admins can read and review flags"
  on public.flags for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- Blog Award 2.0 - migration 6: atomic database functions (RPC)
--
-- RPC Functions:
--   * get_wallet_balance: sums wallet_ledger rows for a user's wallet
--   * cast_votes: atomic transaction enforcing all voting invariants and money safety

-- 1. Derive wallet balance from the append-only ledger
create or replace function public.get_wallet_balance(p_user_id uuid default null)
returns integer
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  target_user_id uuid;
  total_kobo integer;
begin
  target_user_id := coalesce(p_user_id, (select auth.uid()));
  if target_user_id is null then
    return 0;
  end if;

  -- Caller must be the account owner or an administrator
  if target_user_id <> (select auth.uid()) and not public.is_admin() then
    raise exception 'Unauthorized to inspect another user wallet balance.' using errcode = '42501';
  end if;

  select coalesce(sum(amount_kobo), 0)::integer into total_kobo
  from public.wallet_ledger
  where user_id = target_user_id;

  return coalesce(total_kobo, 0);
end;
$$;

comment on function public.get_wallet_balance is
  'Derives current wallet balance in integer kobo by summing ledger entries.';

grant execute on function public.get_wallet_balance(uuid) to authenticated;

-- 2. Atomic Vote Casting Procedure
create or replace function public.cast_votes(
  p_artist_slug text,
  p_votes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  user_email_confirmed boolean;
  user_account_status text;
  v_season record;
  v_artist record;
  v_category record;
  v_wallet record;
  user_balance integer;
  cost_kobo integer;
  new_ledger_id uuid;
  new_receipt_id uuid;
  receipt_code text;
  balance_after integer;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be logged in to vote.' using errcode = 'P0001';
  end if;

  -- 1. Validate vote parameters
  if p_votes is null or p_votes < 1 or p_votes > 100 then
    raise exception 'Choose between 1 and 100 votes.' using errcode = 'P0002';
  end if;

  -- 2. Verify account status and email confirmation
  select
    (email_confirmed_at is not null) into user_email_confirmed
  from auth.users
  where id = current_user_id;

  if not coalesce(user_email_confirmed, false) then
    raise exception 'Confirm your email before you vote.' using errcode = 'P0003';
  end if;

  select account_status into user_account_status
  from public.profiles
  where id = current_user_id;

  if user_account_status <> 'active' then
    raise exception 'This account is unavailable.' using errcode = 'P0004';
  end if;

  -- 3. Verify current season is open
  select * into v_season
  from public.seasons
  where is_current = true
  limit 1;

  if v_season.id is null or v_season.voting_status <> 'open' then
    raise exception 'Voting for this season has ended.' using errcode = 'P0005';
  end if;

  -- 4. Verify artist and category
  select * into v_artist
  from public.artists
  where slug = p_artist_slug and status = 'published'
  limit 1;

  if v_artist.id is null then
    raise exception 'Nominee not found.' using errcode = 'P0006';
  end if;

  select c.* into v_category
  from public.categories c
  join public.artist_categories ac on ac.category_id = c.id
  where ac.artist_id = v_artist.id and c.status = 'open'
  limit 1;

  if v_category.id is null then
    raise exception 'Voting for this category has closed.' using errcode = 'P0007';
  end if;

  -- 5. Calculate cost and verify wallet balance
  cost_kobo := p_votes * v_season.vote_price_kobo;

  select * into v_wallet
  from public.wallets
  where user_id = current_user_id
  for update; -- Lock wallet row during transaction

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Wallet is unavailable.' using errcode = 'P0008';
  end if;

  select coalesce(sum(amount_kobo), 0)::integer into user_balance
  from public.wallet_ledger
  where user_id = current_user_id;

  if user_balance < cost_kobo then
    raise exception 'You do not have enough credits for that many votes.' using errcode = 'P0009';
  end if;

  -- 6. Insert debit ledger entry (atomic)
  insert into public.wallet_ledger (
    wallet_id,
    user_id,
    entry_type,
    amount_kobo,
    related_id,
    description
  )
  values (
    v_wallet.id,
    current_user_id,
    'vote_debit',
    -cost_kobo,
    v_artist.id::text,
    format('Voted for %s (%s votes)', v_artist.name, p_votes)
  )
  returning id into new_ledger_id;

  balance_after := user_balance - cost_kobo;
  receipt_code := 'V-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  -- 7. Insert vote record
  insert into public.votes (
    receipt_no,
    user_id,
    artist_id,
    category_id,
    season_id,
    votes,
    price_kobo,
    total_kobo,
    ledger_entry_id,
    status
  )
  values (
    receipt_code,
    current_user_id,
    v_artist.id,
    v_category.id,
    v_season.id,
    p_votes,
    v_season.vote_price_kobo,
    cost_kobo,
    new_ledger_id,
    'confirmed'
  )
  returning id into new_receipt_id;

  -- 8. Increment artist total votes atomically
  update public.artists
  set votes = votes + p_votes
  where id = v_artist.id;

  -- 9. Return structured receipt matching VoteReceipt domain type
  return jsonb_build_object(
    'id', new_receipt_id,
    'receiptNo', receipt_code,
    'userId', current_user_id,
    'artistId', v_artist.id,
    'artistSlug', v_artist.slug,
    'artistName', v_artist.name,
    'categoryName', v_category.name,
    'votes', p_votes,
    'priceKobo', v_season.vote_price_kobo,
    'totalKobo', cost_kobo,
    'balanceAfterKobo', balance_after,
    'createdAt', now()
  );
end;
$$;

comment on function public.cast_votes is
  'Executes atomic vote transaction: debits ledger, increments vote tally, returns VoteReceipt.';

grant execute on function public.cast_votes(text, integer) to authenticated;
-- Blog Award 2.0 - migration 7: seed inaugural season and categories
--
-- Provides initial default records so the app runs out-of-the-box on a fresh Supabase database.

do $$
declare
  v_season_id uuid;
begin
  -- Only seed if no season exists yet
  if not exists (select 1 from public.seasons limit 1) then
    insert into public.seasons (
      name,
      voting_status,
      vote_price_kobo,
      min_top_up_kobo,
      max_top_up_kobo,
      rules_version,
      show_vote_counts,
      is_current
    )
    values (
      '2026 Season',
      'open',
      5000,   -- â‚¦50 per vote
      25000,  -- â‚¦250 min top-up
      200000, -- â‚¦2,000 max top-up
      1,
      true,
      true
    )
    returning id into v_season_id;

    insert into public.categories (season_id, name, description, eligibility, status, display_order)
    values
      (v_season_id, 'Best Vocal Performance', 'Recognising outstanding lead or solo vocal excellence.', 'Any independent or upcoming Nigerian artist.', 'open', 1),
      (v_season_id, 'Songwriter of the Year', 'Celebrating lyrical artistry, composition and storytelling.', 'Original compositions released within the season window.', 'open', 2),
      (v_season_id, 'Best Independent Single', 'Honouring the strongest independent track of the year.', 'Self-released or indie label singles.', 'open', 3),
      (v_season_id, 'Producer of the Year', 'Excellence in sound design, arrangement and sonic craft.', 'Music producers with approved catalog credits.', 'open', 4);
  end if;
end;
$$;
