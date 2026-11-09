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

