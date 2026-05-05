-- Optional seed data for local development.
-- Real schema is created via migrations; only sample fixtures live here.
-- Run with: `supabase db reset`

-- Two demo shops so the explore page has something to render.
insert into shops (slug, name, description, city, district, status,
                   pet_types, contact_email, contact_phone)
values
  ('happy-paws-taipei',
   'Happy Paws 台北本店',
   '位於信義區的精品寵物旅館，提供獨立小套房與全日活動空間。',
   '台北市', '信義區', 'active',
   '{dog,cat}'::pet_type[],
   'hello@happypaws.tw', '02-2700-0000'),
  ('petville-taichung',
   'PetVille 台中分館',
   '中部最大寵物度假村，提供大型犬戶外活動與專屬保母。',
   '台中市', '北屯區', 'active',
   '{dog}'::pet_type[],
   'hi@petville.tw', '04-2222-3333')
on conflict (slug) do nothing;

-- Sample rooms for Happy Paws.
insert into rooms (shop_id, name, description, total_count, price_per_night,
                   pet_types, pet_sizes, sort_order)
select s.id, '單貓套房', '獨立空間附貓跳台與監視器', 6, 800,
       '{cat}'::pet_type[], '{small,medium}'::pet_size[], 1
from shops s where s.slug = 'happy-paws-taipei'
on conflict do nothing;

insert into rooms (shop_id, name, description, total_count, price_per_night,
                   pet_types, pet_sizes, sort_order)
select s.id, '小型犬獨立房', '可帶寵物的雙人房，可加床', 4, 1200,
       '{dog}'::pet_type[], '{small,medium}'::pet_size[], 2
from shops s where s.slug = 'happy-paws-taipei'
on conflict do nothing;
