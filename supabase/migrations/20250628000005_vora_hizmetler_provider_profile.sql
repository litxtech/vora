-- Usta profili: değerlendirme puanı senkronu + doğrulama bayrakları

create or replace function public.refresh_vora_service_provider_rating(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(3,2);
  v_count int;
begin
  select
    coalesce(
      avg(
        (quality + punctuality + cleanliness + value_for_money + communication)::numeric / 5.0
      ),
      0
    ),
    count(*)::int
  into v_avg, v_count
  from public.vora_service_reviews
  where provider_id = p_provider_id;

  update public.vora_service_providers
  set
    rating = round(greatest(0, least(5, v_avg)), 2),
    review_count = v_count,
    updated_at = now()
  where id = p_provider_id;
end;
$$;

create or replace function public.on_vora_service_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_vora_service_provider_rating(old.provider_id);
    return old;
  end if;
  perform public.refresh_vora_service_provider_rating(new.provider_id);
  return new;
end;
$$;

drop trigger if exists vora_service_reviews_rating_sync on public.vora_service_reviews;
create trigger vora_service_reviews_rating_sync
  after insert or update or delete on public.vora_service_reviews
  for each row execute function public.on_vora_service_review_change();

-- Mevcut değerlendirmelerden puanları yeniden hesapla
do $$
declare
  v_provider_id uuid;
begin
  for v_provider_id in select id from public.vora_service_providers loop
    perform public.refresh_vora_service_provider_rating(v_provider_id);
  end loop;
end;
$$;

create or replace function public.sync_vora_service_provider_verification(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_verified boolean := false;
  v_identity_verified boolean := false;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select coalesce(phone_confirmed_at is not null, false)
  into v_phone_verified
  from auth.users
  where id = p_user_id;

  select coalesce(is_verified, false)
  into v_identity_verified
  from public.profiles
  where id = p_user_id;

  update public.vora_service_providers
  set
    phone_verified = v_phone_verified,
    identity_verified = v_identity_verified,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

grant execute on function public.sync_vora_service_provider_verification(uuid) to authenticated;

create or replace function public.set_vora_service_workplace_verified(
  p_provider_id uuid,
  p_verified boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.vora_service_providers
    where id = p_provider_id
      and user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update public.vora_service_providers
  set workplace_verified = p_verified, updated_at = now()
  where id = p_provider_id;
end;
$$;

grant execute on function public.set_vora_service_workplace_verified(uuid, boolean) to authenticated;
