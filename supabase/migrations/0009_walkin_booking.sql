-- 0009: walk-in booking RPC for shop staff to register a guest who is
-- physically present at the front desk. Differs from create_booking:
--   - status starts at 'checked_in' immediately (no confirm step)
--   - source = 'manual'
--   - Email is optional (front desk may not collect it)
--   - Skips strict availability check by default — staff is the source of
--     truth for what's actually free; we still warn via return value.
--   - Restricted to shop members (owner/staff) of the target shop.

create or replace function create_walkin_booking(
  p_shop_id        uuid,
  p_room_id        uuid,
  p_guest_name     text,
  p_guest_phone    text,
  p_pet_name       text,
  p_pet_type       pet_type,
  p_check_in_date  date,
  p_check_out_date date,
  p_pet_size       pet_size default null,
  p_pet_breed      text default null,
  p_pet_note       text default null,
  p_guest_email    text default null,
  p_guest_note     text default null,
  p_total_price    int default null  -- override; null = computed from room
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
  -- AuthZ: caller must be a member of the target shop (or super admin).
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

  -- Soft availability check: don't block, but report back.
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

grant execute on function create_walkin_booking(
  uuid, uuid, text, text, text, pet_type, date, date,
  pet_size, text, text, text, text, int
) to authenticated;
