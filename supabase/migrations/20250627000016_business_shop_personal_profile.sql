-- Mağaza: kurumsal profilde ziyaretçilere görünür; bireysel bağlı hesapta opsiyonel

alter table public.businesses
  add column if not exists shop_show_on_personal boolean not null default false;

comment on column public.businesses.shop_show_on_personal is
  'Yayında mağazayı bağlı bireysel hesap profilinde de göster';

create or replace function public.get_profile_visible_shop_business_id(p_profile_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account_type public.account_type;
  v_business_id uuid;
begin
  select account_type into v_account_type
  from public.profiles
  where id = p_profile_id;

  if v_account_type is null then
    return null;
  end if;

  if v_account_type = 'business' then
    select b.id into v_business_id
    from public.businesses b
    where b.owner_id = p_profile_id
      and b.registration_status = 'approved'
      and b.shop_published = true
      and b.commerce_mode <> 'none'
    limit 1;
    return v_business_id;
  end if;

  select b.id into v_business_id
  from public.linked_accounts la
  join public.businesses b on b.owner_id = la.business_user_id
  where la.personal_user_id = p_profile_id
    and b.registration_status = 'approved'
    and b.shop_published = true
    and b.shop_show_on_personal = true
    and b.commerce_mode <> 'none'
  limit 1;

  return v_business_id;
end;
$$;

revoke all on function public.get_profile_visible_shop_business_id(uuid) from public;
grant execute on function public.get_profile_visible_shop_business_id(uuid) to anon, authenticated;
