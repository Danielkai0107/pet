-- =====================================================================
-- PetStay platform — initial schema (Phase A)
-- All tables are multi-tenant by `shop_id`; RLS isolates data per shop.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;
-- gen_random_uuid() is provided by pgcrypto; uuid-ossp not required.

-- ---------- enums ----------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'shop_status') then
    create type shop_status as enum ('pending_review', 'active', 'suspended', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'pet_type') then
    create type pet_type as enum ('dog', 'cat', 'rabbit', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'pet_size') then
    create type pet_size as enum ('small', 'medium', 'large', 'xlarge');
  end if;
  if not exists (select 1 from pg_type where typname = 'shop_member_role') then
    create type shop_member_role as enum ('owner', 'staff');
  end if;
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum (
      'pending', 'confirmed', 'declined', 'cancelled',
      'checked_in', 'checked_out', 'no_show'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'booking_source') then
    create type booking_source as enum ('web', 'liff', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type notification_channel as enum ('email', 'line');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type notification_kind as enum (
      'booking_received', 'booking_confirmed', 'booking_declined',
      'booking_reminder', 'booking_cancelled'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type notification_status as enum ('queued', 'sent', 'failed', 'delivered', 'read');
  end if;
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type admin_role as enum ('admin', 'super_admin');
  end if;
end$$;

-- ---------- tables ----------

create table if not exists shops (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  description        text,
  cover_image_url    text,
  gallery_image_urls text[] not null default '{}',
  city               text,
  district           text,
  address            text,
  contact_phone      text,
  contact_email      text,
  line_oa_url        text,
  pet_types          pet_type[] not null default '{dog,cat}',
  status             shop_status not null default 'pending_review',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_shops_status on shops(status);
create index if not exists idx_shops_city   on shops(city);

create table if not exists shop_members (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         shop_member_role not null default 'staff',
  display_name text,
  created_at   timestamptz not null default now(),
  unique (shop_id, user_id)
);
create index if not exists idx_shop_members_user on shop_members(user_id);

create table if not exists rooms (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops(id) on delete cascade,
  name            text not null,
  description     text,
  photo_urls      text[] not null default '{}',
  total_count     integer not null check (total_count >= 0),
  price_per_night integer not null check (price_per_night >= 0),
  pet_types       pet_type[] not null default '{dog}',
  pet_sizes       pet_size[] not null default '{small,medium}',
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_rooms_shop on rooms(shop_id);

create table if not exists room_inventory_overrides (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references rooms(id) on delete cascade,
  date            date not null,
  available_count integer,
  price_override  integer,
  note            text,
  created_at      timestamptz not null default now(),
  unique (room_id, date)
);

create table if not exists customers (
  id             uuid primary key default gen_random_uuid(),
  line_user_id   text unique,
  display_name   text,
  picture_url    text,
  phone          text,
  email          text,
  created_at     timestamptz not null default now(),
  last_active_at timestamptz
);
create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_email on customers(email);

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  shop_id         uuid not null references shops(id) on delete restrict,
  room_id         uuid not null references rooms(id) on delete restrict,
  customer_id     uuid references customers(id) on delete set null,

  guest_name      text not null,
  guest_phone     text not null,
  guest_email     text not null,
  guest_note      text,

  pet_name        text not null,
  pet_type        pet_type not null,
  pet_size        pet_size,
  pet_breed       text,
  pet_note        text,

  check_in_date   date not null,
  check_out_date  date not null,
  nights          integer not null check (nights >= 1),
  total_price     integer not null check (total_price >= 0),

  status          booking_status not null default 'pending',
  source          booking_source not null default 'web',

  created_at      timestamptz not null default now(),
  confirmed_at    timestamptz,
  declined_at     timestamptz,
  cancelled_at    timestamptz,
  checked_in_at   timestamptz,
  checked_out_at  timestamptz,

  check (check_out_date > check_in_date)
);
create index if not exists idx_bookings_shop      on bookings(shop_id);
create index if not exists idx_bookings_status    on bookings(status);
create index if not exists idx_bookings_customer  on bookings(customer_id);
create index if not exists idx_bookings_email     on bookings(guest_email);
create index if not exists idx_bookings_phone     on bookings(guest_phone);
create index if not exists idx_bookings_dates     on bookings(check_in_date, check_out_date);

create table if not exists booking_occupancies (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  room_id     uuid not null references rooms(id) on delete cascade,
  date        date not null
);
create index if not exists idx_occ_room_date on booking_occupancies(room_id, date);
create index if not exists idx_occ_booking   on booking_occupancies(booking_id);

create table if not exists notification_templates (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops(id) on delete cascade,
  kind       notification_kind not null,
  subject    text not null,
  body       text not null,
  is_default boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (shop_id, kind)
);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  channel     notification_channel not null,
  kind        notification_kind not null,
  to_address  text not null,
  subject     text,
  content     text not null,
  status      notification_status not null default 'queued',
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_booking on notifications(booking_id);

create table if not exists favorites (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  shop_id     uuid not null references shops(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (customer_id, shop_id)
);

create table if not exists admins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  role       admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

-- One-time email OTPs used to bind LINE user → existing bookings via email.
create table if not exists email_otps (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code_hash  text not null,
  attempts   integer not null default 0,
  consumed   boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_otps_email on email_otps(email);

-- ---------- helpers ----------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_shops_updated on shops;
create trigger trg_shops_updated before update on shops
  for each row execute function set_updated_at();

drop trigger if exists trg_rooms_updated on rooms;
create trigger trg_rooms_updated before update on rooms
  for each row execute function set_updated_at();

-- Helper: is the current user a member of the given shop?
create or replace function is_shop_member(target_shop uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from shop_members
    where shop_id = target_shop and user_id = auth.uid()
  );
$$;

-- Helper: is the current user a super admin?
create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admins
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- Helper: which customer (in `customers` table) corresponds to current LINE JWT?
-- The JWT custom claim `line_user_id` is set when LIFF logs in via Edge Function.
create or replace function current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from customers c
  where c.line_user_id = nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'line_user_id',
      ''
    ),
    ''
  )
  limit 1;
$$;

-- ---------- RLS ----------

alter table shops                     enable row level security;
alter table shop_members              enable row level security;
alter table rooms                     enable row level security;
alter table room_inventory_overrides  enable row level security;
alter table customers                 enable row level security;
alter table bookings                  enable row level security;
alter table booking_occupancies       enable row level security;
alter table notification_templates    enable row level security;
alter table notifications             enable row level security;
alter table favorites                 enable row level security;
alter table admins                    enable row level security;
alter table email_otps                enable row level security;

-- shops: anyone can read active shops; members & super admins can manage their own
drop policy if exists shops_public_select on shops;
create policy shops_public_select on shops
  for select to anon, authenticated
  using (status = 'active' or is_shop_member(id) or is_super_admin());

drop policy if exists shops_member_update on shops;
create policy shops_member_update on shops
  for update to authenticated
  using (is_shop_member(id) or is_super_admin())
  with check (is_shop_member(id) or is_super_admin());

drop policy if exists shops_super_admin_insert on shops;
create policy shops_super_admin_insert on shops
  for insert to authenticated
  with check (is_super_admin());

-- shop_members: only members can see their own row, super admin sees all
drop policy if exists shop_members_self on shop_members;
create policy shop_members_self on shop_members
  for select to authenticated
  using (user_id = auth.uid() or is_shop_member(shop_id) or is_super_admin());

drop policy if exists shop_members_owner_manage on shop_members;
create policy shop_members_owner_manage on shop_members
  for all to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from shop_members m
      where m.shop_id = shop_members.shop_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  )
  with check (
    is_super_admin()
    or exists (
      select 1 from shop_members m
      where m.shop_id = shop_members.shop_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- rooms: anyone can read rooms of active shops; shop members manage
drop policy if exists rooms_public_select on rooms;
create policy rooms_public_select on rooms
  for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from shops s where s.id = rooms.shop_id and s.status = 'active'
    )
    or is_shop_member(shop_id)
    or is_super_admin()
  );

drop policy if exists rooms_member_manage on rooms;
create policy rooms_member_manage on rooms
  for all to authenticated
  using (is_shop_member(shop_id) or is_super_admin())
  with check (is_shop_member(shop_id) or is_super_admin());

-- room_inventory_overrides: shop members & super admin
drop policy if exists rio_select on room_inventory_overrides;
create policy rio_select on room_inventory_overrides
  for select to anon, authenticated
  using (true);

drop policy if exists rio_member_manage on room_inventory_overrides;
create policy rio_member_manage on room_inventory_overrides
  for all to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from rooms r
      where r.id = room_inventory_overrides.room_id
        and is_shop_member(r.shop_id)
    )
  )
  with check (
    is_super_admin()
    or exists (
      select 1 from rooms r
      where r.id = room_inventory_overrides.room_id
        and is_shop_member(r.shop_id)
    )
  );

-- customers: each LINE user can read/update only their own record
drop policy if exists customers_self_select on customers;
create policy customers_self_select on customers
  for select to authenticated
  using (id = current_customer_id() or is_super_admin());

drop policy if exists customers_self_update on customers;
create policy customers_self_update on customers
  for update to authenticated
  using (id = current_customer_id())
  with check (id = current_customer_id());

-- bookings:
--  * insert: anyone (anon) — guests submit through Web
--  * select: shop members of that shop, the bound customer, or super admin
--  * update: shop members or super admin
drop policy if exists bookings_insert_anyone on bookings;
create policy bookings_insert_anyone on bookings
  for insert to anon, authenticated
  with check (true);

drop policy if exists bookings_member_select on bookings;
create policy bookings_member_select on bookings
  for select to authenticated
  using (
    is_shop_member(shop_id)
    or is_super_admin()
    or customer_id = current_customer_id()
  );

drop policy if exists bookings_member_update on bookings;
create policy bookings_member_update on bookings
  for update to authenticated
  using (is_shop_member(shop_id) or is_super_admin())
  with check (is_shop_member(shop_id) or is_super_admin());

-- booking_occupancies: insert via trigger (security definer); read by members
drop policy if exists occ_select on booking_occupancies;
create policy occ_select on booking_occupancies
  for select to anon, authenticated
  using (true);

drop policy if exists occ_member_manage on booking_occupancies;
create policy occ_member_manage on booking_occupancies
  for all to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from rooms r
      where r.id = booking_occupancies.room_id
        and is_shop_member(r.shop_id)
    )
  )
  with check (true);

-- notifications & templates: shop scoped
drop policy if exists templates_member_all on notification_templates;
create policy templates_member_all on notification_templates
  for all to authenticated
  using (is_shop_member(shop_id) or is_super_admin())
  with check (is_shop_member(shop_id) or is_super_admin());

drop policy if exists notifications_member_select on notifications;
create policy notifications_member_select on notifications
  for select to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from bookings b
      where b.id = notifications.booking_id
        and is_shop_member(b.shop_id)
    )
    or customer_id = current_customer_id()
  );

-- favorites: customers manage their own
drop policy if exists favorites_self on favorites;
create policy favorites_self on favorites
  for all to authenticated
  using (customer_id = current_customer_id() or is_super_admin())
  with check (customer_id = current_customer_id());

-- admins: super admin manages
drop policy if exists admins_self_select on admins;
create policy admins_self_select on admins
  for select to authenticated
  using (user_id = auth.uid() or is_super_admin());

-- email_otps: closed off — only Edge Functions (service role) touch this
drop policy if exists email_otps_no_client on email_otps;
create policy email_otps_no_client on email_otps
  for all to anon, authenticated
  using (false)
  with check (false);

-- ---------- triggers: keep occupancies in sync with bookings ----------

create or replace function expand_booking_occupancies(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b bookings%rowtype;
  d date;
begin
  select * into b from bookings where id = p_booking_id;
  if not found then return; end if;

  delete from booking_occupancies where booking_id = b.id;

  d := b.check_in_date;
  while d < b.check_out_date loop
    insert into booking_occupancies (booking_id, room_id, date)
    values (b.id, b.room_id, d);
    d := d + 1;
  end loop;
end$$;

create or replace function trg_bookings_after_insert_or_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.status in ('pending', 'confirmed', 'checked_in', 'checked_out') then
      perform expand_booking_occupancies(new.id);
    end if;
  elsif (tg_op = 'UPDATE') then
    if (new.status in ('declined', 'cancelled', 'no_show')) then
      delete from booking_occupancies where booking_id = new.id;
    elsif (
      old.check_in_date != new.check_in_date
      or old.check_out_date != new.check_out_date
      or old.room_id != new.room_id
      or (old.status not in ('pending','confirmed','checked_in','checked_out')
          and new.status in ('pending','confirmed','checked_in','checked_out'))
    ) then
      perform expand_booking_occupancies(new.id);
    end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_bookings_sync_occ on bookings;
create trigger trg_bookings_sync_occ
  after insert or update on bookings
  for each row execute function trg_bookings_after_insert_or_update();
