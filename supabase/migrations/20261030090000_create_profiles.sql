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
