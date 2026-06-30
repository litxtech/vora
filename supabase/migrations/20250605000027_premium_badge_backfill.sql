-- Premium rozeti enum değeri ayrı migration'da eklendikten sonra mevcut kullanıcılara uygula
insert into public.user_badges (user_id, badge_type)
select id, 'premium' from public.profiles where is_premium = true
on conflict do nothing;
