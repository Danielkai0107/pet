-- 0010: Storage bucket for shop / room photos.
--
-- Bucket layout:
--   shop-images/<shop_id>/cover.<ext>            ← 商家封面圖
--   shop-images/<shop_id>/rooms/<room_id>/<uuid>.<ext>  ← 房型照片
--
-- 規則：
--   - 公開讀（消費者頁面要看圖）
--   - 寫入 / 更新 / 刪除：只允許該 shop 的 owner / staff（透過
--     is_shop_member helper），或 super admin
--   - 物件路徑第一段（first folder）必須是該店家的 shop_id (uuid)，
--     用 storage.foldername(name) 取得，再傳給 is_shop_member 比對

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-images',
  'shop-images',
  true,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 公開讀
drop policy if exists shop_images_public_read on storage.objects;
create policy shop_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'shop-images');

-- 寫入：第一層 folder 必須是「我所屬店家」的 shop_id
drop policy if exists shop_images_insert on storage.objects;
create policy shop_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-images'
    and (
      is_super_admin()
      or is_shop_member((storage.foldername(name))[1]::uuid)
    )
  );

drop policy if exists shop_images_update on storage.objects;
create policy shop_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-images'
    and (
      is_super_admin()
      or is_shop_member((storage.foldername(name))[1]::uuid)
    )
  )
  with check (
    bucket_id = 'shop-images'
    and (
      is_super_admin()
      or is_shop_member((storage.foldername(name))[1]::uuid)
    )
  );

drop policy if exists shop_images_delete on storage.objects;
create policy shop_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-images'
    and (
      is_super_admin()
      or is_shop_member((storage.foldername(name))[1]::uuid)
    )
  );
