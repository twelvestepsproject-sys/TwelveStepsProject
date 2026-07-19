-- Phase 5 — Storage buckets (§7): public `media` bucket (anon read-only),
-- private `uploads` bucket. Write policies require authenticated + role check.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- media bucket: anyone can read (public bucket also serves this via the
-- public URL, but an explicit SELECT policy keeps direct API reads
-- consistent), only editor+ can write/delete.
create policy media_bucket_select_all on storage.objects
  for select using (bucket_id = 'media');

create policy media_bucket_editor_insert on storage.objects
  for insert
  with check (bucket_id = 'media' and public.current_role_at_least_editor());

create policy media_bucket_editor_update on storage.objects
  for update
  using (bucket_id = 'media' and public.current_role_at_least_editor())
  with check (bucket_id = 'media' and public.current_role_at_least_editor());

create policy media_bucket_editor_delete on storage.objects
  for delete using (bucket_id = 'media' and public.current_role_at_least_editor());

-- uploads bucket: private. Only authenticated editor+ can read or write.
-- No anon access at all.
create policy uploads_bucket_editor_select on storage.objects
  for select using (bucket_id = 'uploads' and public.current_role_at_least_editor());

create policy uploads_bucket_editor_insert on storage.objects
  for insert
  with check (bucket_id = 'uploads' and public.current_role_at_least_editor());

create policy uploads_bucket_editor_update on storage.objects
  for update
  using (bucket_id = 'uploads' and public.current_role_at_least_editor())
  with check (bucket_id = 'uploads' and public.current_role_at_least_editor());

create policy uploads_bucket_editor_delete on storage.objects
  for delete using (bucket_id = 'uploads' and public.current_role_at_least_editor());
