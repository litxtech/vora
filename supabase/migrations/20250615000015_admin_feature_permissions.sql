-- Tüm admin panel modülleri için granüler izin anahtarları (panel.*)

create or replace function public.admin_get_my_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    return '{}'::jsonb;
  end if;

  if v_role = 'super_admin' then
    return coalesce(
      (
        select jsonb_object_agg(permission_key, true)
        from (select distinct permission_key from public.admin_role_permissions) keys
      ),
      '{}'::jsonb
    );
  end if;

  return coalesce(
    (
      select jsonb_object_agg(permission_key, allowed)
      from public.admin_role_permissions
      where role = v_role
    ),
    '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_set_role_permissions_bulk(
  p_role public.user_role,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_allowed boolean;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_permissions is null or jsonb_typeof(p_permissions) <> 'object' then
    raise exception 'Geçersiz izin listesi';
  end if;

  for v_key, v_allowed in
    select key, coalesce((value #>> '{}')::boolean, false)
    from jsonb_each(p_permissions)
  loop
    insert into public.admin_role_permissions (role, permission_key, allowed)
    values (p_role, v_key, v_allowed)
    on conflict (role, permission_key) do update
      set allowed = excluded.allowed;
  end loop;
end;
$$;

grant execute on function public.admin_get_my_permissions() to authenticated;
grant execute on function public.admin_set_role_permissions_bulk(public.user_role, jsonb) to authenticated;

-- panel.* anahtarları — moderatör: adminOnly olmayan modüller açık; admin: hepsi açık
insert into public.admin_role_permissions (role, permission_key, allowed)
select 'moderator', 'panel.' || item_id, not admin_only
from (
  values
    ('features', true),
    ('users', false),
    ('staff', true),
    ('account-lifecycle', true),
    ('support', true),
    ('appeals', false),
    ('reports', false),
    ('ai-moderation', false),
    ('vora-ai', true),
    ('messaging', false),
    ('content', false),
    ('businesses', true),
    ('identity-verification', true),
    ('jobs', false),
    ('personnel', false),
    ('campaigns', false),
    ('calls', false),
    ('social-safety', false),
    ('events', false),
    ('lost-items', false),
    ('marketplace', false),
    ('rides', false),
    ('centers', false),
    ('reporter', false),
    ('news-verification', false),
    ('verification-center', false),
    ('communities', false),
    ('channels', false),
    ('ads', true),
    ('premium', true),
    ('vcts', false),
    ('tasks', true),
    ('hashtags', false),
    ('agenda', false),
    ('profile-boost', true),
    ('feed-curation', true),
    ('reels-curation', true),
    ('discovery-curation', false),
    ('broadcasts', true),
    ('emergency', true),
    ('operations', true),
    ('sounds', true),
    ('music-library', true),
    ('notification-stats', true),
    ('map', false),
    ('logs', false),
    ('statistics', false),
    ('revenue', true),
    ('kuru', true),
    ('security', true),
    ('permissions', true),
    ('system', true),
    ('stripe', true)
) as panel_items(item_id, admin_only)
on conflict (role, permission_key) do nothing;

insert into public.admin_role_permissions (role, permission_key, allowed)
select 'admin', 'panel.' || item_id, true
from (
  values
    ('features'),
    ('users'),
    ('staff'),
    ('account-lifecycle'),
    ('support'),
    ('appeals'),
    ('reports'),
    ('ai-moderation'),
    ('vora-ai'),
    ('messaging'),
    ('content'),
    ('businesses'),
    ('identity-verification'),
    ('jobs'),
    ('personnel'),
    ('campaigns'),
    ('calls'),
    ('social-safety'),
    ('events'),
    ('lost-items'),
    ('marketplace'),
    ('rides'),
    ('centers'),
    ('reporter'),
    ('news-verification'),
    ('verification-center'),
    ('communities'),
    ('channels'),
    ('ads'),
    ('premium'),
    ('vcts'),
    ('tasks'),
    ('hashtags'),
    ('agenda'),
    ('profile-boost'),
    ('feed-curation'),
    ('reels-curation'),
    ('discovery-curation'),
    ('broadcasts'),
    ('emergency'),
    ('operations'),
    ('sounds'),
    ('music-library'),
    ('notification-stats'),
    ('map'),
    ('logs'),
    ('statistics'),
    ('revenue'),
    ('kuru'),
    ('security'),
    ('permissions'),
    ('system'),
    ('stripe')
) as panel_items(item_id)
on conflict (role, permission_key) do nothing;

insert into public.admin_role_permissions (role, permission_key, allowed)
select 'super_admin', 'panel.' || item_id, true
from (
  values
    ('features'),
    ('users'),
    ('staff'),
    ('account-lifecycle'),
    ('support'),
    ('appeals'),
    ('reports'),
    ('ai-moderation'),
    ('vora-ai'),
    ('messaging'),
    ('content'),
    ('businesses'),
    ('identity-verification'),
    ('jobs'),
    ('personnel'),
    ('campaigns'),
    ('calls'),
    ('social-safety'),
    ('events'),
    ('lost-items'),
    ('marketplace'),
    ('rides'),
    ('centers'),
    ('reporter'),
    ('news-verification'),
    ('verification-center'),
    ('communities'),
    ('channels'),
    ('ads'),
    ('premium'),
    ('vcts'),
    ('tasks'),
    ('hashtags'),
    ('agenda'),
    ('profile-boost'),
    ('feed-curation'),
    ('reels-curation'),
    ('discovery-curation'),
    ('broadcasts'),
    ('emergency'),
    ('operations'),
    ('sounds'),
    ('music-library'),
    ('notification-stats'),
    ('map'),
    ('logs'),
    ('statistics'),
    ('revenue'),
    ('kuru'),
    ('security'),
    ('permissions'),
    ('system'),
    ('stripe')
) as panel_items(item_id)
on conflict (role, permission_key) do nothing;
