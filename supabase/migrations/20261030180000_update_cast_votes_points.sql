-- Blog Award 2.0 - migration 10: adapt cast_votes for points-based wallet
--
-- Calculates vote cost in points (1 vote = 1 point by default, or vote_price_kobo / 5000)
-- Deducts points atomically from append-only wallet_ledger

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
  vote_price_points integer;
  cost_points integer;
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

  -- 5. Calculate cost in points (1 vote = 1 point)
  vote_price_points := case
    when v_season.vote_price_kobo >= 50 then round(v_season.vote_price_kobo / 5000.0)::integer
    else coalesce(v_season.vote_price_kobo, 1)
  end;
  if vote_price_points < 1 then
    vote_price_points := 1;
  end if;

  cost_points := p_votes * vote_price_points;

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

  if user_balance < cost_points then
    raise exception 'You do not have enough points for that many votes.' using errcode = 'P0009';
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
    -cost_points,
    v_artist.id::text,
    format('Voted for %s (%s votes, %s points)', v_artist.name, p_votes, cost_points)
  )
  returning id into new_ledger_id;

  balance_after := user_balance - cost_points;
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
    vote_price_points,
    cost_points,
    new_ledger_id,
    'confirmed'
  )
  returning id into new_receipt_id;

  -- 8. Increment artist votes
  update public.artists
  set votes = votes + p_votes
  where id = v_artist.id;

  -- 9. Return receipt payload
  return jsonb_build_object(
    'id', new_receipt_id,
    'receiptNo', receipt_code,
    'userId', current_user_id,
    'artistId', v_artist.id,
    'artistSlug', v_artist.slug,
    'artistName', v_artist.name,
    'categoryName', v_category.name,
    'votes', p_votes,
    'priceKobo', vote_price_points,
    'totalKobo', cost_points,
    'balanceAfterKobo', balance_after,
    'createdAt', now()
  );
end;
$$;

comment on function public.cast_votes is
  'Atomically executes a vote transaction in points, deducting from wallet_ledger and recording audit trail.';

grant execute on function public.cast_votes(text, integer) to authenticated;
