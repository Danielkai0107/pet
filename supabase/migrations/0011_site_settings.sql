-- 0011: 站台層級的 KV 設定（首頁 hero、品牌標語…等）
--
-- 目前單純存平面 key/value(text)，未來想加複合資料時再用 jsonb 升級即可。

create table if not exists site_settings (
  key         text primary key,
  value       text,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table site_settings enable row level security;

-- 讀：所有人都可讀（首頁 hero 是公開資訊）
drop policy if exists site_settings_public_read on site_settings;
create policy site_settings_public_read on site_settings
  for select to anon, authenticated
  using (true);

-- 寫：只有 super_admin
drop policy if exists site_settings_super_admin_write on site_settings;
create policy site_settings_super_admin_write on site_settings
  for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- 預先 seed 一筆 — 讓 SuperAdmin 進去就看到
insert into site_settings (key, value)
values ('home_hero_image_url', null)
on conflict (key) do nothing;

-- 公開讀取的 RPC（避免前端要懂 table 結構）
create or replace function get_site_setting(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from site_settings where key = p_key;
$$;

grant execute on function get_site_setting(text) to anon, authenticated;

-- ============================================================================
-- Storage RLS 修正 — 0010 的 policy 直接 cast first folder 為 uuid，
-- 對非 uuid 路徑（如 super admin 上傳的 `_site/...`）會在 runtime 拋
-- error。這裡用 CASE 強制求值順序，保證：
--   1. super_admin 永遠通過（不 cast）
--   2. 只有當第一段 folder 看起來像 uuid 才往下 cast 與 is_shop_member 比對
-- ============================================================================

drop policy if exists shop_images_insert on storage.objects;
create policy shop_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-images'
    and (
      case
        when is_super_admin() then true
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          then is_shop_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  );

drop policy if exists shop_images_update on storage.objects;
create policy shop_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-images'
    and (
      case
        when is_super_admin() then true
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          then is_shop_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  )
  with check (
    bucket_id = 'shop-images'
    and (
      case
        when is_super_admin() then true
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          then is_shop_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  );

drop policy if exists shop_images_delete on storage.objects;
create policy shop_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-images'
    and (
      case
        when is_super_admin() then true
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          then is_shop_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  );
