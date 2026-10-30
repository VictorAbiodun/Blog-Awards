-- pgTAP tests for the profiles table. Run with:  supabase test db
begin;
select plan(13);

-- Two fans, created the way Supabase Auth creates them.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ada@example.com', '{"display_name": "Ada"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bola@example.com', '{}');

select is(
  (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Ada',
  'a profile is created automatically using the display name from sign-up'
);
select is(
  (select display_name from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'Fan',
  'a profile falls back to "Fan" when no display name was given'
);

-- Act as Ada.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*)::int from public.profiles), 1, 'a fan can see only one profile: their own');
select is(
  (select count(*)::int from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'a fan cannot read another fan''s profile'
);
select is_empty(
  $$update public.profiles set display_name = 'Hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' returning id$$,
  'a fan cannot edit another fan''s profile'
);
select isnt_empty(
  $$update public.profiles set display_name = 'Ada A.' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning id$$,
  'a fan can edit their own display name'
);
select throws_ok(
  $$update public.profiles set account_status = 'disabled' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'a fan cannot change their own account status'
);
select throws_ok(
  $$update public.profiles set display_name = repeat('x', 61) where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514',
  null,
  'a display name longer than 60 characters is rejected'
);
select throws_ok(
  $$insert into public.profiles (id, display_name) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sneaky')$$,
  '42501',
  null,
  'a fan cannot insert profiles through the API'
);
select throws_ok(
  $$delete from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'a fan cannot delete profiles through the API'
);

-- Visitors who are not signed in.
reset role;
set local role anon;
select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'a visitor who is not signed in cannot read profiles'
);

-- A disabled account cannot edit its own profile.
reset role;
update public.profiles set account_status = 'disabled' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is_empty(
  $$update public.profiles set display_name = 'Still here' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning id$$,
  'a disabled account cannot edit its profile'
);

-- Deleting the auth user removes the profile.
reset role;
delete from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select is(
  (select count(*)::int from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'deleting an account deletes its profile'
);

select * from finish();
rollback;
