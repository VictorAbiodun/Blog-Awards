-- Blog Award 2.0 - migration 11: fix admin permission check in funding approval and rejection
--
-- Enables service-role calls from Next.js server route to verify p_admin_id via is_admin(v_admin_id)

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
  v_admin_id := coalesce(p_admin_id, (select auth.uid()));

  -- Verify admin role for the determined admin id
  if not public.is_admin(v_admin_id) then
    raise exception 'Unauthorized: Only administrators can approve funding requests.' using errcode = '42501';
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
    entity_type,
    entity_id,
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
  v_admin_id := coalesce(p_admin_id, (select auth.uid()));

  -- Verify admin role for the determined admin id
  if not public.is_admin(v_admin_id) then
    raise exception 'Unauthorized: Only administrators can reject funding requests.' using errcode = '42501';
  end if;

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
    entity_type,
    entity_id,
    reason
  )
  values (
    v_admin_id,
    'funding_rejected',
    'funding_request',
    p_request_id::text,
    format('Rejected reference %s: %s', v_req.reference, trim(p_rejection_reason))
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

