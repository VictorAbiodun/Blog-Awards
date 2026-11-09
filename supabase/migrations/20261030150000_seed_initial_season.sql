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
      5000,   -- ₦50 per vote
      25000,  -- ₦250 min top-up
      200000, -- ₦2,000 max top-up
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

