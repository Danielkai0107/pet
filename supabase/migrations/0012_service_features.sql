-- 0012: 「服務特色」master list（SuperAdmin 維護） + 商家可勾選的對應欄位
--
-- 設計：
--   - service_features：平台層級的可選清單，欄位包含 key（內部識別）/
--     label（顯示文字）/ icon（lucide 圖示名）/ description（選填說明
--     文）/ sort_order / is_active
--   - shops.service_feature_keys text[]：商家在後台勾選的 key 陣列
--   - 公開頁渲染時讀 service_features 跟 shop 對 join 顯示

create table if not exists service_features (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  description text,
  icon        text not null default 'Sparkles',
  sort_order  int  not null default 0,
  is_active   bool not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_service_features_updated_at
before update on service_features
for each row execute function set_updated_at();

alter table service_features enable row level security;

-- 公開讀「上架中」的特色（給消費者頁面/商家後台 multi-select 用）
drop policy if exists service_features_public_read on service_features;
create policy service_features_public_read on service_features
  for select to anon, authenticated
  using (true);

-- 寫：只有 super admin
drop policy if exists service_features_super_admin_write on service_features;
create policy service_features_super_admin_write on service_features
  for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- shops 加上勾選欄位 — 預設空陣列
alter table shops
  add column if not exists service_feature_keys text[] not null default '{}';

-- Seed：四個原本 hardcoded 在 ShopDetailPage 的特色，改成可編輯
insert into service_features (key, label, description, icon, sort_order)
values
  ('vet_oncall',     '合格獸醫合作 24h 緊急聯絡', '合作獸醫提供 24 小時緊急聯絡,確保毛孩突發狀況有專業醫療支援。', 'ShieldCheck', 10),
  ('daily_clean',    '每日清潔消毒',                 '每日全區清潔消毒,保持房型乾淨衛生。',                                      'Sparkles',    20),
  ('private_room',   '個別籠舍 / 隔離安排',         '提供獨立空間,並可依需求安排隔離,避免毛孩之間的緊張。',           'PawPrint',    30),
  ('daily_activity', '每日活動與互動',                '安排每日散步、互動時間,讓毛孩心情放鬆。',                                  'Bed',         40)
on conflict (key) do nothing;
