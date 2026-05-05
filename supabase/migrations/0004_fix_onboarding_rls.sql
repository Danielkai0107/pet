-- =====================================================================
-- Phase F+ — fix onboarding RLS recursion + open shop creation
-- Bug: shop_members_owner_manage's WITH CHECK referenced shop_members
--      inline → infinite RLS recursion → 500 on any shop_members query.
-- Bug: shops_super_admin_insert blocked self-service onboarding.
-- =====================================================================

-- 1. Helper: is current user an "owner" of given shop?
create or replace function is_shop_owner(target_shop uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from shop_members
    where shop_id = target_shop
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- 2. Rewrite shop_members policies (no inline self-table subqueries).
drop policy if exists shop_members_self on shop_members;
drop policy if exists shop_members_owner_manage on shop_members;

create policy shop_members_select on shop_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_shop_member(shop_id)
    or is_super_admin()
  );

-- INSERT only via the create_shop_with_owner RPC (security definer, bypasses RLS).
-- Direct INSERT is restricted to existing owners adding staff, or super admin.
create policy shop_members_insert on shop_members
  for insert to authenticated
  with check (
    is_super_admin() or is_shop_owner(shop_id)
  );

create policy shop_members_update on shop_members
  for update to authenticated
  using (is_super_admin() or is_shop_owner(shop_id))
  with check (is_super_admin() or is_shop_owner(shop_id));

create policy shop_members_delete on shop_members
  for delete to authenticated
  using (is_super_admin() or is_shop_owner(shop_id));

-- 3. Allow any authenticated user to insert a shop (status forced pending).
drop policy if exists shops_super_admin_insert on shops;
create policy shops_authenticated_insert on shops
  for insert to authenticated
  with check (
    is_super_admin() or status = 'pending_review'
  );

-- 4. Atomic RPC: create shop + claim ownership.
create or replace function create_shop_with_owner(
  p_slug text,
  p_name text,
  p_description text default null,
  p_city text default null,
  p_district text default null,
  p_address text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_pet_types pet_type[] default array['dog','cat']::pet_type[]
)
returns shops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_shop shops;
begin
  if v_uid is null then
    raise exception 'must be authenticated';
  end if;

  if exists (select 1 from shops where slug = p_slug) then
    raise exception 'slug already taken: %', p_slug
      using errcode = '23505';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into shops (
    slug, name, description, city, district, address,
    contact_phone, contact_email, pet_types, status
  )
  values (
    p_slug, p_name, p_description, p_city, p_district, p_address,
    p_contact_phone, coalesce(p_contact_email, v_email),
    coalesce(p_pet_types, array['dog','cat']::pet_type[]),
    'pending_review'
  )
  returning * into v_shop;

  insert into shop_members (shop_id, user_id, role, display_name)
  values (
    v_shop.id, v_uid, 'owner',
    nullif(split_part(coalesce(v_email, ''), '@', 1), '')
  );

  return v_shop;
end;
$$;

grant execute on function create_shop_with_owner(
  text, text, text, text, text, text, text, text, pet_type[]
) to authenticated;
