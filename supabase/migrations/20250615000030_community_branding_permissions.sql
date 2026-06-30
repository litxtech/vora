-- Topluluk kapak/ikon yalnızca kurucu tarafından güncellenebilir.
-- Rol atamaları (admin/moderator) yalnızca kurucuya açılır.

create or replace function public.enforce_community_branding_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.community_member_role;
begin
  if old.cover_url is distinct from new.cover_url
     or old.icon_url is distinct from new.icon_url then
    select role into v_role
    from public.community_members
    where community_id = new.id and user_id = auth.uid();

    if v_role is distinct from 'owner' then
      raise exception 'Kapak ve profil görselini yalnızca kurucu değiştirebilir';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists communities_branding_owner_guard on public.communities;
create trigger communities_branding_owner_guard
  before update of cover_url, icon_url on public.communities
  for each row execute function public.enforce_community_branding_owner();

create or replace function public.update_community_branding(
  p_community_id uuid,
  p_cover_url text default null,
  p_icon_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.community_member_role;
begin
  select role into v_role
  from public.community_members
  where community_id = p_community_id and user_id = auth.uid();

  if v_role is distinct from 'owner' then
    raise exception 'Yalnızca kurucu görsel güncelleyebilir';
  end if;

  update public.communities
  set
    cover_url = coalesce(p_cover_url, cover_url),
    icon_url = coalesce(p_icon_url, icon_url)
  where id = p_community_id;
end;
$$;

create or replace function public.update_community_member_role(
  p_community_id uuid,
  p_member_id uuid,
  p_new_role public.community_member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role public.community_member_role;
begin
  select role into v_my_role
  from public.community_members
  where community_id = p_community_id and user_id = auth.uid();

  if v_my_role is distinct from 'owner' then
    raise exception 'Rol atamasını yalnızca kurucu yapabilir';
  end if;

  if p_new_role = 'owner' and p_member_id <> auth.uid() then
    raise exception 'Sahiplik devri henüz desteklenmiyor';
  end if;

  if p_member_id = auth.uid() and p_new_role <> 'owner' then
    raise exception 'Kurucu kendi rolünü düşüremez';
  end if;

  update public.community_members
  set role = p_new_role
  where community_id = p_community_id and user_id = p_member_id;
end;
$$;

grant execute on function public.update_community_branding(uuid, text, text) to authenticated;
