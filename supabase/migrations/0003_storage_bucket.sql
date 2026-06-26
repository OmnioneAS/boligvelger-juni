-- Storage bucket for building/floor-plan images uploaded per project view.
-- Public: anon read is allowed (images are served in the public embed).
-- Write access is via the service-role key only (through /api/storage/upload-view-image).

insert into storage.buckets (id, name, public)
values ('view-images', 'view-images', true)
on conflict (id) do nothing;

-- Allow anonymous reads so the embed can display uploaded images.
create policy "view-images: public read"
  on storage.objects for select
  using (bucket_id = 'view-images');
