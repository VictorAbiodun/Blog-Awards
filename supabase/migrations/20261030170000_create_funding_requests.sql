-- Blog Award 2.0 - migration 9: manual OPay points funding requests and atomic verification
--
-- Features:
--   * funding_requests table for manual bank transfer tracking
--   * foreign key to profiles for PostgREST display name embeds
--   * atomic approve_funding_request RPC: locks row, computes points, credits ledger, writes audit log
--   * atomic reject_funding_request RPC: locks row, updates rejection reason, writes audit log
--   * RLS policies protecting user and administrator operations

-- 1. Create funding_requests table
create table if not exists public.funding_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    constraint funding_requests_reference_format check (reference ~ '^FUND-[A-Za-z0-9_-]+$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  requested_amount_naira integer not null
    constraint funding_requests_requested_amount_check check (requested_amount_naira >= 50 and requested_amount_naira % 50 = 0),
  actual_amount_naira integer
    constraint funding_requests_actual_amount_check check (actual_amount_naira is null or actual_amount_naira > 0),
  expected_points integer not null
    constraint funding_requests_expected_points_check check (expected_points > 0),
  credited_points integer
    constraint funding_requests_credited_points_check check (credited_points is null or credited_points >= 0),
  conversion_rate integer not null default 50
    constraint funding_requests_rate_check check (conversion_rate > 0),
  status text not null default 'awaiting_payment'
    constraint funding_requests_status_valid check (status in ('awaiting_payment', 'pending_verification', 'approved', 'rejected', 'expired')),
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foreign key linking user_id to public.profiles(id) for Supabase joins
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'funding_requests_user_id_profiles_fkey'
  ) then
    alter table public.funding_requests
      add constraint funding_requests_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;

-- Indexes for performance
create index if not exists idx_funding_requests_user_id on public.funding_requests(user_id);
create index if not exists idx_funding_requests_status on public.funding_requests(status);
create index if not exists idx_funding_requests_reference on public.funding_requests(reference);
create index if not exists idx_funding_requests_created_at on public.funding_requests(created_at desc);

-- Set updated_at trigger
drop trigger if exists funding_requests_set_updated_at on public.funding_requests;
create trigger funding_requests_set_updated_at
  before update on public.funding_requests
  for each row execute function public.set_updated_at();

-- 2. Row Level Security
alter table public.funding_requests enable row level security;

-- Fans can view their own funding requests
drop policy if exists "funding_requests_select_owner" on public.funding_requests;
create policy "funding_requests_select_owner"
  on public.funding_requests for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Fans can create funding requests for themselves
drop policy if exists "funding_requests_insert_owner" on public.funding_requests;
create policy "funding_requests_insert_owner"
  on public.funding_requests for insert
  to authenticated
  with check (
    user_id = (select auth.uid()) and
    status in ('awaiting_payment', 'pending_verification')
  );

-- Fans can notify payment (transition from awaiting_payment to pending_verification)
drop policy if exists "funding_requests_update_owner" on public.funding_requests;
create policy "funding_requests_update_owner"
  on public.funding_requests for update
  to authenticated
  using (
    user_id = (select auth.uid()) and
    status = 'awaiting_payment'
  )
  with check (
    user_id = (select auth.uid()) and
    status = 'pending_verification'
  );

-- Admins can view all funding requests
drop policy if exists "funding_requests_select_admin" on public.funding_requests;
create policy "funding_requests_select_admin"
  on public.funding_requests for select
  to authenticated
  using (public.is_admin());

-- 3. Atomic RPC: approve_funding_request
create or replace function public.approve_funding_request(
  p_request_id uuid,
  p_actual_amount_naira integer,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_req record;
  calc_points integer;
  new_ledger_id uuid;
  new_balance integer;
begin
  -- Verify caller is admin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can approve funding requests.' using errcode = '42501';
  end if;

  v_admin_id := coalesce(p_admin_id, (select auth.uid()));

  -- Lock funding request row
  select * into v_req
  from public.funding_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Funding request not found.' using errcode = 'P0002';
  end if;

  if v_req.status = 'approved' then
    raise exception 'This funding request has already been approved.' using errcode = 'P0003';
  end if;

  if p_actual_amount_naira is null or p_actual_amount_naira <= 0 then
    raise exception 'Please enter a valid received amount.' using errcode = 'P0004';
  end if;

  -- Points calculation (₦50 = 1 point by default or based on request snapshot)
  calc_points := floor(p_actual_amount_naira / coalesce(v_req.conversion_rate, 50))::integer;
  if calc_points <= 0 then
    raise exception 'The received amount corresponds to 0 points. Minimum amount is ₦%.' , coalesce(v_req.conversion_rate, 50) using errcode = 'P0005';
  end if;

  -- Update funding request
  update public.funding_requests
  set
    status = 'approved',
    actual_amount_naira = p_actual_amount_naira,
    credited_points = calc_points,
    approved_at = now(),
    approved_by = v_admin_id,
    updated_at = now()
  where id = p_request_id;

  -- Insert credit ledger entry (atomic)
  insert into public.wallet_ledger (
    wallet_id,
    user_id,
    entry_type,
    amount_kobo,
    related_id,
    description
  )
  values (
    v_req.wallet_id,
    v_req.user_id,
    'top_up',
    calc_points,
    v_req.reference,
    format('OPay Wallet Funding (%s points)', calc_points)
  )
  returning id into new_ledger_id;

  -- Record in audit log
  insert into public.audit_logs (
    user_id,
    action,
    target_type,
    target_id,
    reason
  )
  values (
    v_admin_id,
    'funding_approved',
    'funding_request',
    p_request_id::text,
    format('Approved ₦%s (%s points credited) for reference %s', p_actual_amount_naira, calc_points, v_req.reference)
  );

  -- Derive new balance
  select coalesce(sum(amount_kobo), 0)::integer into new_balance
  from public.wallet_ledger
  where user_id = v_req.user_id;

  return jsonb_build_object(
    'id', v_req.id,
    'reference', v_req.reference,
    'status', 'approved',
    'actualAmountNaira', p_actual_amount_naira,
    'creditedPoints', calc_points,
    'approvedAt', now(),
    'newBalancePoints', new_balance
  );
end;
$$;

comment on function public.approve_funding_request is
  'Atomically approves a manual OPay funding request, credits user wallet ledger in points, and writes audit record.';

grant execute on function public.approve_funding_request(uuid, integer, uuid) to authenticated;

-- 4. Atomic RPC: reject_funding_request
create or replace function public.reject_funding_request(
  p_request_id uuid,
  p_rejection_reason text,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_req record;
begin
  -- Verify caller is admin
  if not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can reject funding requests.' using errcode = '42501';
  end if;

  v_admin_id := coalesce(p_admin_id, (select auth.uid()));

  if p_rejection_reason is null or length(trim(p_rejection_reason)) < 3 then
    raise exception 'A rejection reason of at least 3 characters is required.' using errcode = 'P0001';
  end if;

  -- Lock funding request row
  select * into v_req
  from public.funding_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Funding request not found.' using errcode = 'P0002';
  end if;

  if v_req.status = 'approved' then
    raise exception 'An approved funding request cannot be rejected.' using errcode = 'P0003';
  end if;

  -- Update funding request
  update public.funding_requests
  set
    status = 'rejected',
    rejection_reason = trim(p_rejection_reason),
    approved_at = now(),
    approved_by = v_admin_id,
    updated_at = now()
  where id = p_request_id;

  -- Record in audit log
  insert into public.audit_logs (
    user_id,
    action,
    target_type,
    target_id,
    reason
  )
  values (
    v_admin_id,
    'funding_rejected',
    'funding_request',
    p_request_id::text,
    format('Rejected reference %s. Reason: %s', v_req.reference, trim(p_rejection_reason))
  );

  return jsonb_build_object(
    'id', v_req.id,
    'reference', v_req.reference,
    'status', 'rejected',
    'rejectionReason', trim(p_rejection_reason),
    'approvedAt', now()
  );
end;
$$;

comment on function public.reject_funding_request is
  'Atomically rejects a manual funding request with a documented reason and writes audit record.';

grant execute on function public.reject_funding_request(uuid, text, uuid) to authenticated;
