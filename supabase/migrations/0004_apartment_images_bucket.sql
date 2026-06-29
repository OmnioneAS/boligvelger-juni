-- Storage bucket for apartment gallery images (renders, floor plans, photos).
-- Public: anon read allowed (images shown in the public embed modal).
-- Write: service-role only, through /api/storage/upload-apartment-image.

insert into storage.buckets (id, name, public)
values ('apartment-images', 'apartment-images', true)
on conflict (id) do nothing;

create policy "apartment-images: public read"
  on storage.objects for select
  using (bucket_id = 'apartment-images');
