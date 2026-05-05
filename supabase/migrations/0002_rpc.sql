-- =====================================================================
-- RPCs called from the client.
-- =====================================================================

-- ---------- get_room_availability ----------
-- Returns one row per day in [start_date, end_date) with the available
-- inventory and effective price for the given room.
create or replace function public.get_room_availability(
  p_room_id   uuid,
  p_start     date,
  p_end       date
)
returns table (
  date      date,
  available integer,
  price     integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r rooms%rowtype;
begin
  select * into r from rooms where id = p_room_id and is_active;
  if not found then
    return;
  end if;

  return query
  with days as (
    select d::date as date
    from generate_series(p_start, p_end - interval '1 day', interval '1 day') d
  ),
  used as (
    select bo.date, count(*) as taken
    from booking_occupancies bo
    join bookings b on b.id = bo.booking_id
    where bo.room_id = p_room_id
      and bo.date between p_start and p_end - interval '1 day'
      and b.status in ('pending', 'confirmed', 'checked_in', 'checked_out')
    group by bo.date
  ),
  overrides as (
    select date, available_count, price_override
    from room_inventory_overrides
    where room_id = p_room_id
      and date between p_start and p_end - interval '1 day'
  )
  select
    d.date,
    coalesce(o.available_count, r.total_count) - coalesce(u.taken, 0) as available,
    coalesce(o.price_override, r.price_per_night) as price
  from days d
  left join used u      on u.date = d.date
  left join overrides o on o.date = d.date
  order by d.date;
end$$;

grant execute on function public.get_room_availability(uuid, date, date)
  to anon, authenticated;

-- ---------- create_booking ----------
-- Atomic guest-side booking creation that re-checks availability under
-- a per-room advisory lock to prevent two parties from grabbing the
-- last room simultaneously.
create or replace function public.create_booking(
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
  id   uuid,
  code text
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
  v_code       text;
  v_id         uuid;
  v_lock_key   bigint;
  v_total_p    int := 0;
  d            date;
  v_price      int;
begin
  -- 1) basic validation
  if p_check_out_date <= p_check_in_date then
    raise exception 'check_out_date must be after check_in_date';
  end if;

  v_nights := p_check_out_date - p_check_in_date;

  select * into r from rooms where id = p_room_id and is_active;
  if not found then
    raise exception 'room not found or inactive';
  end if;

  select * into s from shops where id = r.shop_id and status = 'active';
  if not found then
    raise exception 'shop not active';
  end if;

  -- 2) advisory lock per-room to serialize availability checks
  v_lock_key := abs(hashtextextended(p_room_id::text, 0));
  perform pg_advisory_xact_lock(v_lock_key);

  -- 3) re-check availability for every night
  select min(available), sum(price) into v_min_avail, v_total_p
  from public.get_room_availability(p_room_id, p_check_in_date, p_check_out_date);

  if v_min_avail is null or v_min_avail <= 0 then
    raise exception 'no availability for selected dates';
  end if;

  v_total := coalesce(v_total_p, r.price_per_night * v_nights);

  -- 4) generate human-friendly code: PS-yyMMdd-XXXXXX
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

  -- consume v_price/d so noUnusedLocals-style validation isn't an issue;
  -- (kept here for future per-day expansion if pricing changes)
  d := p_check_in_date;
  v_price := r.price_per_night;
  perform v_price + extract(epoch from d)::int;

  return query select v_id, v_code;
end$$;

grant execute on function public.create_booking(
  uuid, text, text, text, text,
  text, pet_type, pet_size, text, text,
  date, date
) to anon, authenticated;

-- ---------- search_shops ----------
-- Returns active shops filtered by city, pet types, and (optional) date
-- range with at least one room available.
create or replace function public.search_shops(
  p_city       text default null,
  p_pet_type   pet_type default null,
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
  pet_types       pet_type[],
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

grant execute on function public.search_shops(text, pet_type, date, date, integer)
  to anon, authenticated;
