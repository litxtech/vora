-- Öne çıkan profiller bölümü — admin manuel aç/kapa + boost iptali kampanya metnini de temizler

insert into public.app_feature_flags (feature_id, label, feature_group) values
  ('featured-profiles', 'Öne Çıkan Profiller', 'social')
on conflict (feature_id) do nothing;

create or replace function public.admin_revoke_profile_boost(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.profiles
  set
    profile_boosted_until = null,
    profile_boost_message = null,
    updated_at = now()
  where id = p_user_id;
end;
$$;
