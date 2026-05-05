-- =====================================================================
-- Phase F: super-admin bootstrap helpers + scheduled jobs.
-- =====================================================================

-- ---------- promote helper ----------
-- Promote a user to super_admin by email. Run once after signing up the
-- first super admin user in Supabase Auth:
--   select promote_super_admin('you@example.com');
create or replace function public.promote_super_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = p_email limit 1;
  if v_uid is null then
    raise exception 'no auth user with email %', p_email;
  end if;
  insert into admins (user_id, role)
  values (v_uid, 'super_admin')
  on conflict (user_id) do update set role = 'super_admin';
end$$;

-- ---------- shop subscriptions ----------
-- Lightweight subscription table keyed by shop. A real billing
-- integration can plug in later; for now this lets Phase F surface
-- expiry warnings.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type subscription_plan as enum ('trial', 'basic', 'pro');
  end if;
end$$;

create table if not exists shop_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null unique references shops(id) on delete cascade,
  plan         subscription_plan not null default 'trial',
  starts_at    timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '30 days'),
  auto_renew   boolean not null default false,
  updated_at   timestamptz not null default now()
);
alter table shop_subscriptions enable row level security;

drop policy if exists subs_member_select on shop_subscriptions;
create policy subs_member_select on shop_subscriptions
  for select to authenticated
  using (is_shop_member(shop_id) or is_super_admin());

drop policy if exists subs_admin_manage on shop_subscriptions;
create policy subs_admin_manage on shop_subscriptions
  for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- ---------- expiry sweep ----------
-- Suspend shops whose subscription expired (intended to run via pg_cron).
create or replace function public.sweep_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt integer := 0;
begin
  with expired as (
    select shop_id from shop_subscriptions
    where expires_at < now()
  ),
  upd as (
    update shops
    set status = 'suspended'
    where id in (select shop_id from expired)
      and status = 'active'
    returning 1
  )
  select count(*) into cnt from upd;
  return cnt;
end$$;

-- ---------- check-in reminders ----------
-- Returns booking ids that should receive a tomorrow-reminder email.
create or replace function public.bookings_to_remind()
returns table (booking_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select b.id
  from bookings b
  where b.status = 'confirmed'
    and b.check_in_date = (current_date + 1)
    and not exists (
      select 1 from notifications n
      where n.booking_id = b.id and n.kind = 'booking_reminder'
    );
$$;

-- Note: To actually schedule these on Supabase Cloud, enable the
-- `pg_cron` extension and run e.g.
--   select cron.schedule(
--     'sweep-subs-daily', '0 3 * * *',
--     $$select public.sweep_expired_subscriptions()$$
--   );
