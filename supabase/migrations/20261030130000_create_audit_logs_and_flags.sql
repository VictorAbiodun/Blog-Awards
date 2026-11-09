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

