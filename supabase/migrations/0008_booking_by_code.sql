-- 0008: public-facing RPCs that let a guest view + cancel their booking
-- using the booking code as a bearer token. The code is the random
-- unguessable string `bookings.code` (set at creation time), so anyone with
-- the link from their email / LINE message can use it. This is the standard
-- pattern for "view your booking" deeplinks.

-- get_booking_by_code: returns flat booking row + selected shop / room
-- columns. Single function call, no auth required.
create or replace function get_booking_by_code(p_code text)
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
  pet_type pet_type,
  pet_size pet_size,
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

grant execute on function get_booking_by_code(text) to anon, authenticated;

-- cancel_booking_by_code: idempotent cancellation. Only succeeds when the
-- booking is in pending or confirmed status (you cannot cancel a booking
-- that has already checked in or has been declined). Returns the updated
-- booking_id + new status so the caller can reflect state in UI.
create or replace function cancel_booking_by_code(p_code text)
returns table (booking_id uuid, new_status booking_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_status booking_status;
begin
  select b.id, b.status into v_booking_id, v_status
    from bookings b
   where b.code = p_code
   for update;

  if v_booking_id is null then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  if v_status = 'cancelled' then
    -- already cancelled — return as-is so retries are safe.
    return query select v_booking_id, v_status;
    return;
  end if;

  if v_status not in ('pending', 'confirmed') then
    raise exception '此訂單目前狀態為 % ，無法取消，請與店家聯繫', v_status
      using errcode = 'P0001';
  end if;

  update bookings
     set status = 'cancelled', cancelled_at = now()
   where id = v_booking_id;

  return query select v_booking_id, 'cancelled'::booking_status;
end;
$$;

grant execute on function cancel_booking_by_code(text) to anon, authenticated;
