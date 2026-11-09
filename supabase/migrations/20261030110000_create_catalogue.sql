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

