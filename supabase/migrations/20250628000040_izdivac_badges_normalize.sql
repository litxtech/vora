-- Jigolo, Tilki ve Finansman tikleri artık "normal tik" olarak davranır:
--  • İzdivaç erişiminden bağımsızdır (erişim kalksa bile tik kalır)
--  • Her yerde (uygulama + İzdivaç) görünür; görünürlük seçeneği kaldırıldı
--  • Yine yalnızca admin tarafından (İzdivaç admin ekranından) verilir
-- Görünürlük kolonu geriye dönük uyumluluk için tutulur ama hep 'both' olur.

-- Eski kayıtları normal tik görünürlüğüne taşı.
update public.izdivac_special_badges
set visibility = 'both'
where visibility is distinct from 'both';

-- ─── Admin: tik ver (görünürlük artık önemsiz, daima 'both') ─────────────────
create or replace function public.admin_grant_izdivac_badge(
  p_user_id uuid,
  p_badge_type text,
  p_visibility text default 'both'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  if p_badge_type not in ('jigolo', 'tilki', 'finansman') then
    raise exception 'Geçersiz tik türü';
  end if;

  insert into public.izdivac_special_badges (user_id, badge_type, visibility, granted_by, granted_at)
  values (p_user_id, p_badge_type, 'both', auth.uid(), now())
  on conflict (user_id, badge_type)
  do update set visibility = 'both', granted_by = excluded.granted_by, granted_at = now();

  v_label := case p_badge_type
    when 'jigolo' then 'Jigolo'
    when 'tilki' then 'Tilki'
    when 'finansman' then 'Finansman'
    else p_badge_type
  end;

  perform public.notify_profile_user(
    p_user_id,
    'badge_earned',
    v_label,
    'Size özel bir tik verildi: ' || v_label,
    jsonb_build_object('badgeType', p_badge_type, 'scope', 'izdivac')
  );
end;
$$;

grant execute on function public.admin_grant_izdivac_badge(uuid, text, text) to authenticated;

-- ─── Tek kullanıcı okuma: erişim/görünürlük filtresi yok ─────────────────────
create or replace function public.izdivac_user_special_badges(
  p_user_id uuid,
  p_context text default 'izdivac'
)
returns table (badge_type text, visibility text)
language sql
stable
security definer
set search_path = public
as $$
  select b.badge_type, b.visibility
  from public.izdivac_special_badges b
  where b.user_id = p_user_id
  order by b.granted_at;
$$;

grant execute on function public.izdivac_user_special_badges(uuid, text) to authenticated;

-- ─── Toplu okuma (feed/reels): erişim/görünürlük filtresi yok ────────────────
create or replace function public.izdivac_app_special_badges_batch(p_user_ids uuid[])
returns table (user_id uuid, badge_type text)
language sql
stable
security definer
set search_path = public
as $$
  select b.user_id, b.badge_type
  from public.izdivac_special_badges b
  where b.user_id = any(p_user_ids)
  order by b.granted_at;
$$;

grant execute on function public.izdivac_app_special_badges_batch(uuid[]) to authenticated;
