-- =====================================================================
-- 0014: Stay logs (booking_logs) + LINE phone-binding state on
--        customers + get_shop_customers RPC
--
-- 1) booking_logs：店家入住期間的拍照／文字日誌；可一鍵推播給家長 LINE
-- 2) customers.pending_bind_*：暫存「輸入手機 → 等待回覆『確認』」狀態
-- 3) notification_kind 加 'stay_log'
-- 4) get_shop_customers RPC：店家後台「客戶管理」彙總
-- 5) RLS：店家成員可全控自家 booking_logs；綁定的 customer 可讀
-- =====================================================================

-- ---------- 1) booking_logs ----------

create table if not exists booking_logs (
  id                       uuid primary key default gen_random_uuid(),
  booking_id               uuid not null references bookings(id) on delete cascade,
  shop_id                  uuid not null references shops(id) on delete cascade,
  author_user_id           uuid references auth.users(id) on delete set null,
  photo_urls               text[] not null default '{}',
  note                     text,
  notify_status            text not null default 'pending'
    check (notify_status in ('pending','sent','failed','no_line','skipped')),
  notify_error             text,
  notify_sent_at           timestamptz,
  notify_to_line_user_id   text,
  created_at               timestamptz not null default now()
);
create index if not exists idx_booking_logs_booking
  on booking_logs(booking_id);
create index if not exists idx_booking_logs_shop_created
  on booking_logs(shop_id, created_at desc);

alter table booking_logs enable row level security;

-- 店家成員 / super admin：可全控
drop policy if exists booking_logs_member_all on booking_logs;
create policy booking_logs_member_all on booking_logs
  for all to authenticated
  using (is_shop_member(shop_id) or is_super_admin())
  with check (is_shop_member(shop_id) or is_super_admin());

-- 已綁定該訂單的 customer：可讀
drop policy if exists booking_logs_customer_select on booking_logs;
create policy booking_logs_customer_select on booking_logs
  for select to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = booking_logs.booking_id
        and b.customer_id = current_customer_id()
    )
  );

-- ---------- 2) customers: pending bind state ----------

alter table customers
  add column if not exists pending_bind_phone text;
alter table customers
  add column if not exists pending_bind_expires_at timestamptz;

-- ---------- 3) notification_kind enum: 'stay_log' ----------

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'notification_kind'::regtype
      and enumlabel = 'stay_log'
  ) then
    alter type notification_kind add value 'stay_log';
  end if;
end $$;

-- ---------- 4) get_shop_customers RPC ----------
-- 以「正規化過的手機號碼」為主鍵彙總該店家的所有客戶（含 walk-in），
-- 並從 customers 表 join LINE 綁定狀態 / 顯示名稱 / 大頭貼。
--
-- 正規化規則對齊 Edge Function `notify-line` 內 normalizePhone：
-- 去空白 / 去連字號 / 去括號，把開頭的 +886 改 0。

create or replace function get_shop_customers(p_shop_id uuid)
returns table (
  phone               text,
  name                text,
  bookings_count      int,
  last_check_in       date,
  total_spent         bigint,
  line_bound          boolean,
  line_display_name   text,
  line_picture_url    text
)
language sql
stable
security definer
set search_path = public
as $$
  with norm as (
    select
      regexp_replace(
        regexp_replace(b.guest_phone, '[\s\-()]', '', 'g'),
        '^\+886', '0'
      ) as phone,
      b.guest_name,
      b.check_in_date,
      b.total_price,
      b.status
    from bookings b
    where b.shop_id = p_shop_id
      and (is_shop_member(p_shop_id) or is_super_admin())
  ),
  agg as (
    select
      n.phone,
      (array_agg(n.guest_name order by n.check_in_date desc nulls last))[1] as name,
      count(*)::int as bookings_count,
      max(n.check_in_date) as last_check_in,
      sum(case
            when n.status not in ('declined','cancelled','no_show')
            then n.total_price else 0
          end)::bigint as total_spent
    from norm n
    group by n.phone
  )
  select
    a.phone,
    a.name,
    a.bookings_count,
    a.last_check_in,
    a.total_spent,
    (c.line_user_id is not null) as line_bound,
    c.display_name as line_display_name,
    c.picture_url as line_picture_url
  from agg a
  left join customers c on c.phone = a.phone
  order by a.last_check_in desc nulls last;
$$;

grant execute on function get_shop_customers(uuid) to authenticated;
