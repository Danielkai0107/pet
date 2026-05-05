-- =====================================================================
-- Phase F++ — 修 get_room_availability 欄位模糊 bug + 加批次庫存 RPC
-- Bug: RETURNS TABLE(date date, ...) 與 CTE 的 date 欄位 / 表欄位衝突，
--      PG 報「column reference 'date' is ambiguous」→ 400。
-- 修法: 重建函式，所有 date 欄位完全 qualify。
-- =====================================================================

-- 1. 修 get_room_availability：移除模糊欄位，所有引用都 qualify
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
    select gs::date as d
    from generate_series(p_start, p_end - interval '1 day', interval '1 day') gs
  ),
  used as (
    select bo.date as d, count(*) as taken
    from booking_occupancies bo
    join bookings b on b.id = bo.booking_id
    where bo.room_id = p_room_id
      and bo.date between p_start and p_end - interval '1 day'
      and b.status in ('pending', 'confirmed', 'checked_in', 'checked_out')
    group by bo.date
  ),
  overrides as (
    select rio.date as d, rio.available_count, rio.price_override
    from room_inventory_overrides rio
    where rio.room_id = p_room_id
      and rio.date between p_start and p_end - interval '1 day'
  )
  select
    days.d as date,
    (coalesce(o.available_count, r.total_count) - coalesce(u.taken, 0))::integer as available,
    coalesce(o.price_override, r.price_per_night) as price
  from days
  left join used      u on u.d = days.d
  left join overrides o on o.d = days.d
  order by days.d;
end$$;

grant execute on function public.get_room_availability(uuid, date, date)
  to anon, authenticated;


-- 2. 新增批次庫存設定 RPC：套用週期模板到日期範圍
-- p_weekdays: 0=週日, 1=週一, …, 6=週六；空陣列=全部
create or replace function public.bulk_set_room_inventory(
  p_room_id        uuid,
  p_start          date,
  p_end            date,
  p_weekdays       int[] default '{}',
  p_available      integer default null,
  p_price_override integer default null,
  p_note           text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room   rooms%rowtype;
  v_uid    uuid := auth.uid();
  v_count  integer := 0;
  v_d      date;
  v_dow    int;
begin
  if v_uid is null then
    raise exception 'must be authenticated';
  end if;

  select * into v_room from rooms where id = p_room_id;
  if not found then
    raise exception 'room not found';
  end if;

  -- 權限：必須是該店家成員或 super admin
  if not (is_shop_member(v_room.shop_id) or is_super_admin()) then
    raise exception 'forbidden: not a member of shop %', v_room.shop_id;
  end if;

  if p_end <= p_start then
    raise exception 'p_end must be after p_start';
  end if;

  if p_available is null and p_price_override is null then
    raise exception 'either p_available or p_price_override must be set';
  end if;

  v_d := p_start;
  while v_d < p_end loop
    v_dow := extract(dow from v_d)::int;
    if array_length(p_weekdays, 1) is null
       or v_dow = any(p_weekdays) then

      insert into room_inventory_overrides
        (room_id, date, available_count, price_override, note)
      values
        (p_room_id, v_d, p_available, p_price_override, p_note)
      on conflict (room_id, date) do update
      set available_count = coalesce(excluded.available_count,
                                     room_inventory_overrides.available_count),
          price_override  = coalesce(excluded.price_override,
                                     room_inventory_overrides.price_override),
          note            = coalesce(excluded.note,
                                     room_inventory_overrides.note);
      v_count := v_count + 1;
    end if;
    v_d := v_d + 1;
  end loop;

  return v_count;
end$$;

grant execute on function public.bulk_set_room_inventory(
  uuid, date, date, int[], integer, integer, text
) to authenticated;


-- 3. 新增批次清除 override RPC（恢復預設）
create or replace function public.bulk_clear_room_inventory(
  p_room_id  uuid,
  p_start    date,
  p_end      date,
  p_weekdays int[] default '{}'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room  rooms%rowtype;
  v_uid   uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'must be authenticated';
  end if;

  select * into v_room from rooms where id = p_room_id;
  if not found then
    raise exception 'room not found';
  end if;

  if not (is_shop_member(v_room.shop_id) or is_super_admin()) then
    raise exception 'forbidden';
  end if;

  with del as (
    delete from room_inventory_overrides rio
    where rio.room_id = p_room_id
      and rio.date >= p_start
      and rio.date < p_end
      and (
        array_length(p_weekdays, 1) is null
        or extract(dow from rio.date)::int = any(p_weekdays)
      )
    returning 1
  )
  select count(*)::integer into v_count from del;

  return coalesce(v_count, 0);
end$$;

grant execute on function public.bulk_clear_room_inventory(uuid, date, date, int[])
  to authenticated;
