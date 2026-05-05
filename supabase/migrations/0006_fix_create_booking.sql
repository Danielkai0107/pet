-- =====================================================================
-- 修 create_booking 函式 column 'id' 模糊 bug。
-- RETURNS TABLE(id uuid, code text) 在函式 body 內讓所有未 qualify
-- 的 `id` / `code` 引用都模糊化 → 報 42702 column ambiguous → 整個
-- 預約流程 500。
--
-- 修法：
-- 1. DROP 舊函式（PG 不允許 CREATE OR REPLACE 改 return type）
-- 2. 用 booking_id / booking_code 為 OUT 欄位避免命名衝突
-- 3. body 內所有 id / code 完全 qualify
-- =====================================================================

drop function if exists public.create_booking(
  uuid, text, text, text, text,
  text, pet_type, pet_size, text, text,
  date, date
);

create function public.create_booking(
  p_room_id        uuid,
  p_guest_name     text,
  p_guest_phone    text,
  p_guest_email    text,
  p_guest_note     text,
  p_pet_name       text,
  p_pet_type       pet_type,
  p_pet_size       pet_size,
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
  text, pet_type, pet_size, text, text,
  date, date
) to anon, authenticated;
