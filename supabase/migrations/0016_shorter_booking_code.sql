-- =====================================================================
-- 0016: 縮短 booking code
--
-- 舊格式：
--   PS-251112-A1B2C3   (16 字)
--   WK-251112-A1B2C3   (16 字)
--
-- 新格式：8 字大寫 hex（取自 gen_random_uuid 前 8 字），無前綴、無分隔
--   範例：A1B2C3D4
--
-- 為何不要前綴：
--   - 在 UI 顯示時太長，家長 / 店家難記
--   - bookings.source 欄位 (`web` / `manual`) 已能區分線上 / 現場單
--   - LIFF / Email 連結會帶 code 進 URL，越短越好
--
-- 碰撞風險：
--   16^8 = 4.29 × 10^9 種組合。bookings.code 為 unique constraint，
--   萬一極低機率撞上，insert 會丟唯一鍵錯誤，前端 / RPC caller 直接重試
--   即可。沒有特別加 retry loop，避免複雜化。
--
-- 兼容性：
--   舊 booking code（PS-/WK- 開頭）仍然有效，所有以 code 為鍵的 RPC
--   (get_booking_by_code / cancel_booking_by_code / get_booking_logs_by_code)
--   都不需要任何改動。
-- =====================================================================

-- 共用 helper：產生 8 字大寫 hex
create or replace function public.gen_booking_code()
returns text
language sql
volatile
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

grant execute on function public.gen_booking_code() to anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- create_booking — 線上預約（覆寫 0013 版本，僅改 v_code 行）
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.create_booking(
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

  v_code := public.gen_booking_code();

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

-- ──────────────────────────────────────────────────────────────────────
-- create_walkin_booking — 現場登記（覆寫 0013 版本，僅改 v_code 行）
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.create_walkin_booking(
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

  v_code := public.gen_booking_code();

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
