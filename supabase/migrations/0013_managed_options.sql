-- =====================================================================
-- 0013: SuperAdmin-managed option tables
--   寵物類型 / 寵物體型 / 城市清單 → 全部從 enum / 硬編碼常數
--   遷移成 DB-backed lookup tables，SuperAdmin 可在站台設定中
--   新增 / 編輯 / 排序 / 啟用停用。
--
-- 主要變更：
-- 1) DROP 所有引用 pet_type / pet_size enum 的 RPC
-- 2) ALTER 將 columns 從 enum 改成 text / text[]
-- 3) DROP enum types pet_type, pet_size
-- 4) 建立 pet_types / pet_sizes / pet_type_size_labels / cities tables 並 seed
-- 5) 重新建立 RPCs 使用 text 型別（原欄位名 / 順序保持不變）
--
-- 設計選擇：
-- - 不對 bookings.pet_type / shops.pet_types / rooms.pet_types 新增 FK
--   約束（避免 admin 移除選項時破壞既有訂單），改用 admin UI 端控管。
-- =====================================================================

-- ---------- 1) DROP RPCs referencing pet_type / pet_size ----------
drop function if exists public.create_booking(
  uuid, text, text, text, text,
  text, pet_type, pet_size, text, text,
  date, date
);
drop function if exists public.search_shops(
  text, pet_type, date, date, integer
);
drop function if exists public.create_walkin_booking(
  uuid, uuid, text, text, text, pet_type, date, date,
  pet_size, text, text, text, text, int
);
drop function if exists public.create_shop_with_owner(
  text, text, text, text, text, text, text, text, pet_type[]
);
drop function if exists public.get_booking_by_code(text);

-- ---------- 2) Convert columns from enum -> text ----------
alter table shops
  alter column pet_types type text[] using pet_types::text[];
alter table shops
  alter column pet_types set default array['dog','cat']::text[];

alter table rooms
  alter column pet_types type text[] using pet_types::text[];
alter table rooms
  alter column pet_types set default array['dog']::text[];

alter table rooms
  alter column pet_sizes type text[] using pet_sizes::text[];
alter table rooms
  alter column pet_sizes set default array['small','medium']::text[];

alter table bookings
  alter column pet_type type text using pet_type::text;
alter table bookings
  alter column pet_size type text using pet_size::text;

-- ---------- 3) DROP enum types ----------
drop type if exists pet_type;
drop type if exists pet_size;

-- ---------- 4) Lookup tables ----------
create table if not exists public.pet_types (
  key         text primary key,
  label       text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.pet_sizes (
  key         text primary key,
  label       text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 每個寵物類型可以有自己的尺寸描述（例：狗 small = 小型 ≤10kg）
-- 只負責「label override」，size 必須先存在於 pet_sizes。
create table if not exists public.pet_type_size_labels (
  pet_type_key text not null references public.pet_types(key) on update cascade on delete cascade,
  pet_size_key text not null references public.pet_sizes(key) on update cascade on delete cascade,
  label        text not null,
  primary key (pet_type_key, pet_size_key)
);

create table if not exists public.cities (
  name        text primary key,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- 5) Seed initial data (idempotent) ----------
insert into public.pet_types (key, label, sort_order, is_active) values
  ('dog',    '狗',   10, true),
  ('cat',    '貓',   20, true),
  ('rabbit', '兔',   30, true),
  ('other',  '其他', 99, true)
on conflict (key) do nothing;

insert into public.pet_sizes (key, label, sort_order, is_active) values
  ('small',  '小型',   10, true),
  ('medium', '中型',   20, true),
  ('large',  '大型',   30, true),
  ('xlarge', '超大型', 40, true)
on conflict (key) do nothing;

insert into public.pet_type_size_labels (pet_type_key, pet_size_key, label) values
  ('dog',    'small',  '小型 (≤10kg)'),
  ('dog',    'medium', '中型 (10-25kg)'),
  ('dog',    'large',  '大型 (25-40kg)'),
  ('dog',    'xlarge', '超大型 (>40kg)'),
  ('cat',    'small',  '幼貓 / 小型'),
  ('cat',    'medium', '成貓'),
  ('cat',    'large',  '大型品種'),
  ('cat',    'xlarge', '超大型'),
  ('rabbit', 'small',  '幼兔'),
  ('rabbit', 'medium', '成兔'),
  ('rabbit', 'large',  '大型品種'),
  ('rabbit', 'xlarge', '超大型')
on conflict (pet_type_key, pet_size_key) do nothing;

insert into public.cities (name, sort_order, is_active) values
  ('台北市', 10, true),
  ('新北市', 20, true),
  ('桃園市', 30, true),
  ('台中市', 40, true),
  ('台南市', 50, true),
  ('高雄市', 60, true),
  ('基隆市', 70, true),
  ('新竹市', 80, true),
  ('新竹縣', 90, true),
  ('苗栗縣', 100, true),
  ('彰化縣', 110, true),
  ('南投縣', 120, true),
  ('雲林縣', 130, true),
  ('嘉義市', 140, true),
  ('嘉義縣', 150, true),
  ('屏東縣', 160, true),
  ('宜蘭縣', 170, true),
  ('花蓮縣', 180, true),
  ('台東縣', 190, true),
  ('澎湖縣', 200, true),
  ('金門縣', 210, true),
  ('連江縣', 220, true)
on conflict (name) do nothing;

-- ---------- 6) RLS ----------
alter table public.pet_types enable row level security;
alter table public.pet_sizes enable row level security;
alter table public.pet_type_size_labels enable row level security;
alter table public.cities enable row level security;

create policy "pet_types public read" on public.pet_types
  for select using (true);
create policy "pet_sizes public read" on public.pet_sizes
  for select using (true);
create policy "pet_type_size_labels public read" on public.pet_type_size_labels
  for select using (true);
create policy "cities public read" on public.cities
  for select using (true);

create policy "pet_types admin write" on public.pet_types
  for all using (is_super_admin()) with check (is_super_admin());
create policy "pet_sizes admin write" on public.pet_sizes
  for all using (is_super_admin()) with check (is_super_admin());
create policy "pet_type_size_labels admin write" on public.pet_type_size_labels
  for all using (is_super_admin()) with check (is_super_admin());
create policy "cities admin write" on public.cities
  for all using (is_super_admin()) with check (is_super_admin());

-- ---------- 7) Recreate RPCs with text args ----------

-- create_booking
create function public.create_booking(
  p_room_id        uuid,
  p_guest_name     text,
  p_guest_phone    text,
  p_guest_email    text,
  p_guest_note     text,
  p_pet_name       text,
  p_pet_type       text,
  p_pet_size       text,
  p_pet_breed      text,
  p_pet_note       text,
  p_check_in_date  date,
  p_check_out_date date
)
returns table (
  booking_id   uuid,
  booking_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r            rooms%rowtype;
  s            shops%rowtype;
  v_nights     int;
  v_total      int;
  v_min_avail  int;
  v_total_p    int := 0;
  v_code       text;
  v_id         uuid;
  v_lock_key   bigint;
begin
  if p_check_out_date <= p_check_in_date then
    raise exception 'check_out_date must be after check_in_date';
  end if;

  v_nights := p_check_out_date - p_check_in_date;

  select * into r from rooms where rooms.id = p_room_id and rooms.is_active;
  if not found then
    raise exception 'room not found or inactive';
  end if;

  select * into s from shops where shops.id = r.shop_id and shops.status = 'active';
  if not found then
    raise exception 'shop not active';
  end if;

  v_lock_key := abs(hashtextextended(p_room_id::text, 0));
  perform pg_advisory_xact_lock(v_lock_key);

  select min(ga.available), sum(ga.price)
    into v_min_avail, v_total_p
  from public.get_room_availability(p_room_id, p_check_in_date, p_check_out_date) ga;

  if v_min_avail is null or v_min_avail <= 0 then
    raise exception 'no availability for selected dates';
  end if;

  v_total := coalesce(v_total_p, r.price_per_night * v_nights);

  v_code := 'PS-' || to_char(now() at time zone 'Asia/Taipei', 'YYMMDD')
            || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into bookings (
    code, shop_id, room_id, customer_id,
    guest_name, guest_phone, guest_email, guest_note,
    pet_name, pet_type, pet_size, pet_breed, pet_note,
    check_in_date, check_out_date, nights, total_price,
    status, source
  ) values (
    v_code, r.shop_id, r.id, current_customer_id(),
    p_guest_name, p_guest_phone, p_guest_email, p_guest_note,
    p_pet_name, p_pet_type, p_pet_size, p_pet_breed, p_pet_note,
    p_check_in_date, p_check_out_date, v_nights, v_total,
    'pending', 'web'
  )
  returning bookings.id into v_id;

  return query select v_id, v_code;
end$$;

grant execute on function public.create_booking(
  uuid, text, text, text, text,
  text, text, text, text, text,
  date, date
) to anon, authenticated;

-- search_shops
create function public.search_shops(
  p_city       text default null,
  p_pet_type   text default null,
  p_check_in   date default null,
  p_check_out  date default null,
  p_max_price  integer default null
)
returns table (
  id              uuid,
  slug            text,
  name            text,
  city            text,
  district        text,
  cover_image_url text,
  pet_types       text[],
  min_price       integer
)
language sql
stable
security definer
set search_path = public
as $$
  with shop_min_price as (
    select rooms.shop_id, min(rooms.price_per_night) as min_price
    from rooms
    where rooms.is_active
      and (p_pet_type is null or p_pet_type = any(rooms.pet_types))
    group by rooms.shop_id
  )
  select
    s.id, s.slug, s.name, s.city, s.district,
    s.cover_image_url, s.pet_types, smp.min_price
  from shops s
  left join shop_min_price smp on smp.shop_id = s.id
  where s.status = 'active'
    and (p_city is null or s.city = p_city)
    and (p_pet_type is null or p_pet_type = any(s.pet_types))
    and (p_max_price is null or smp.min_price is null or smp.min_price <= p_max_price)
    and (
      p_check_in is null or p_check_out is null
      or exists (
        select 1 from rooms r
        where r.shop_id = s.id
          and r.is_active
          and (p_pet_type is null or p_pet_type = any(r.pet_types))
          and exists (
            select 1
            from public.get_room_availability(r.id, p_check_in, p_check_out) ga
            where ga.available > 0
          )
      )
    )
  order by smp.min_price nulls last, s.created_at desc;
$$;

grant execute on function public.search_shops(text, text, date, date, integer)
  to anon, authenticated;

-- create_walkin_booking
create function public.create_walkin_booking(
  p_shop_id        uuid,
  p_room_id        uuid,
  p_guest_name     text,
  p_guest_phone    text,
  p_pet_name       text,
  p_pet_type       text,
  p_check_in_date  date,
  p_check_out_date date,
  p_pet_size       text default null,
  p_pet_breed      text default null,
  p_pet_note       text default null,
  p_guest_email    text default null,
  p_guest_note     text default null,
  p_total_price    int default null
)
returns table (booking_id uuid, booking_code text, warning text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r           rooms%rowtype;
  v_nights    int;
  v_total     int;
  v_min_avail int;
  v_id        uuid;
  v_code      text;
  v_warning   text := null;
begin
  if not (is_shop_member(p_shop_id) or is_super_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_check_out_date <= p_check_in_date then
    raise exception 'check_out_date must be after check_in_date';
  end if;

  v_nights := p_check_out_date - p_check_in_date;

  select * into r from rooms
    where rooms.id = p_room_id and rooms.shop_id = p_shop_id;
  if not found then
    raise exception 'room not found in this shop';
  end if;

  select min(ga.available) into v_min_avail
    from public.get_room_availability(p_room_id, p_check_in_date, p_check_out_date) ga;
  if v_min_avail is null or v_min_avail <= 0 then
    v_warning := '此房型在所選日期已無剩餘庫存，仍會建立此筆現場預約';
  end if;

  v_total := coalesce(p_total_price, r.price_per_night * v_nights);

  v_code := 'WK-' || to_char(now() at time zone 'Asia/Taipei', 'YYMMDD')
            || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into bookings (
    code, shop_id, room_id,
    guest_name, guest_phone, guest_email, guest_note,
    pet_name, pet_type, pet_size, pet_breed, pet_note,
    check_in_date, check_out_date, nights, total_price,
    status, source,
    confirmed_at, checked_in_at
  ) values (
    v_code, p_shop_id, r.id,
    p_guest_name, p_guest_phone, coalesce(nullif(trim(p_guest_email), ''), ''), p_guest_note,
    p_pet_name, p_pet_type, p_pet_size, p_pet_breed, p_pet_note,
    p_check_in_date, p_check_out_date, v_nights, v_total,
    'checked_in', 'manual',
    now(), now()
  )
  returning bookings.id into v_id;

  return query select v_id, v_code, v_warning;
end$$;

grant execute on function public.create_walkin_booking(
  uuid, uuid, text, text, text, text, date, date,
  text, text, text, text, text, int
) to authenticated;

-- create_shop_with_owner
create function public.create_shop_with_owner(
  p_slug          text,
  p_name          text,
  p_description   text default null,
  p_city          text default null,
  p_district      text default null,
  p_address       text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_pet_types     text[] default array['dog','cat']::text[]
)
returns shops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_shop    shops%rowtype;
begin
  if v_user_id is null then
    raise exception 'must be signed in' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  insert into shops (
    slug, name, description, city, district, address,
    contact_phone, contact_email, pet_types, status
  )
  values (
    p_slug, p_name, p_description, p_city, p_district, p_address,
    p_contact_phone, coalesce(p_contact_email, v_email),
    coalesce(p_pet_types, array['dog','cat']::text[]),
    'pending_review'
  )
  returning * into v_shop;

  insert into shop_members (shop_id, user_id, role)
  values (v_shop.id, v_user_id, 'owner')
  on conflict (shop_id, user_id) do nothing;

  return v_shop;
end$$;

grant execute on function public.create_shop_with_owner(
  text, text, text, text, text, text, text, text, text[]
) to authenticated;

-- get_booking_by_code (re-create with text pet_type / pet_size, 其它欄位不變)
create function public.get_booking_by_code(p_code text)
returns table (
  id uuid,
  code text,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  shop_phone text,
  shop_city text,
  shop_district text,
  shop_address text,
  shop_cover_image_url text,
  room_id uuid,
  room_name text,
  guest_name text,
  guest_phone text,
  guest_email text,
  guest_note text,
  pet_name text,
  pet_type text,
  pet_size text,
  pet_breed text,
  pet_note text,
  check_in_date date,
  check_out_date date,
  nights int,
  total_price numeric,
  status booking_status,
  source text,
  created_at timestamptz,
  confirmed_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.code,
    b.shop_id,
    s.name        as shop_name,
    s.slug        as shop_slug,
    s.contact_phone as shop_phone,
    s.city        as shop_city,
    s.district    as shop_district,
    s.address     as shop_address,
    s.cover_image_url as shop_cover_image_url,
    b.room_id,
    r.name        as room_name,
    b.guest_name,
    b.guest_phone,
    b.guest_email,
    b.guest_note,
    b.pet_name,
    b.pet_type,
    b.pet_size,
    b.pet_breed,
    b.pet_note,
    b.check_in_date,
    b.check_out_date,
    b.nights,
    b.total_price,
    b.status,
    b.source::text,
    b.created_at,
    b.confirmed_at,
    b.declined_at,
    b.cancelled_at,
    b.checked_in_at,
    b.checked_out_at
  from bookings b
  join shops s on s.id = b.shop_id
  join rooms r on r.id = b.room_id
  where b.code = p_code
  limit 1;
$$;

grant execute on function public.get_booking_by_code(text) to anon, authenticated;
