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

