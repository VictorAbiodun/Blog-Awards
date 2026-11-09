-- Blog Award 2.0 - migration 12: Super Admin role and Role Management procedure
--
-- Features:
--   * Expands user_roles check constraint to include 'super_admin'
--   * is_admin(uuid) returns true for both 'admin' and 'super_admin'
--   * is_super_admin(uuid) returns true only for 'super_admin'
--   * Elevates uchihavictor593@gmail.com to 'super_admin'
--   * Atomic procedure set_user_role(target_id, role, operator_id) restricted strictly to super_admin

-- 1. Update role constraint
alter table public.user_roles drop constraint if exists user_roles_role_valid;
alter table public.user_roles add constraint user_roles_role_valid check (role in ('fan', 'admin', 'super_admin'));

-- 2. Update is_admin function
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

  return user_role in ('admin', 'super_admin');
end;
$$;

-- 3. Create is_super_admin function
create or replace function public.is_super_admin(p_user_id uuid default null)
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

  return user_role = 'super_admin';
end;
$$;

grant execute on function public.is_super_admin(uuid) to authenticated, anon;

-- 4. Elevate uchihavictor593@gmail.com to super_admin
update public.user_roles
set role = 'super_admin'
where user_id in (
  select id from auth.users where email = 'uchihavictor593@gmail.com'
);

-- 5. Atomic procedure for Super Admin to assign or revoke admin roles
create or replace function public.set_user_role(
  p_target_user_id uuid,
  p_new_role text,
  p_operator_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator_id uuid;
  target_existing_role text;
  target_email text;
begin
  v_operator_id := coalesce(p_operator_id, (select auth.uid()));

  -- Caller must be a super_admin
  if not public.is_super_admin(v_operator_id) then
    raise exception 'Unauthorized: Only the Super Administrator can change user roles.' using errcode = '42501';
  end if;

  -- Allowed target roles: fan or admin (cannot create multiple super admins)
  if p_new_role not in ('fan', 'admin') then
    raise exception 'Invalid role. Only normal "admin" or "fan" roles can be assigned.' using errcode = 'P0001';
  end if;

  -- Check existing role of target
  select role into target_existing_role
  from public.user_roles
  where user_id = p_target_user_id;

  if target_existing_role is null then
    raise exception 'User not found in role registry.' using errcode = 'P0002';
  end if;

  if target_existing_role = 'super_admin' then
    raise exception 'The Super Administrator role cannot be altered or demoted.' using errcode = 'P0003';
  end if;

  -- Get target user email for audit logging
  select email into target_email
  from auth.users
  where id = p_target_user_id;

  -- Update role
  update public.user_roles
  set
    role = p_new_role,
    updated_at = now()
  where user_id = p_target_user_id;

  -- Log administrative action
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    reason
  )
  values (
    v_operator_id,
    case when p_new_role = 'admin' then 'promote_admin' else 'demote_admin' end,
    'user',
    p_target_user_id::text,
    format('%s %s to %s',
      case when p_new_role = 'admin' then 'Promoted' else 'Demoted' end,
      coalesce(target_email, p_target_user_id::text),
      p_new_role
    )
  );

  return jsonb_build_object(
    'userId', p_target_user_id,
    'role', p_new_role,
    'updatedAt', now()
  );
end;
$$;

comment on function public.set_user_role is
  'Allows the Super Administrator to promote a user to admin or demote an admin to fan.';

grant execute on function public.set_user_role(uuid, text, uuid) to authenticated;
