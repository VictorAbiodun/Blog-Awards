-- Migration: Create nominees storage bucket and RLS policies
-- Bucket: 'nominees' (public read, admin write)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nominees',
  'nominees',
  true,
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage RLS Policies
drop policy if exists "Nominee images are publicly accessible" on storage.objects;
create policy "Nominee images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'nominees');

drop policy if exists "Admins can upload nominee images" on storage.objects;
create policy "Admins can upload nominee images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'nominees'
    and (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
        and ur.role in ('admin', 'super_admin')
      )
    )
  );

drop policy if exists "Admins can update nominee images" on storage.objects;
create policy "Admins can update nominee images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'nominees'
    and (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
        and ur.role in ('admin', 'super_admin')
      )
    )
  );

drop policy if exists "Admins can delete nominee images" on storage.objects;
create policy "Admins can delete nominee images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'nominees'
    and (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
        and ur.role in ('admin', 'super_admin')
      )
    )
  );
