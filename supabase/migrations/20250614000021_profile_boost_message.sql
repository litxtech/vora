-- Profil öne çıkarma kampanya metni + güvenli RPC'ler (privileged alan koruması bypass)

alter table public.profiles
  add column if not exists profile_boost_message text;

alter table public.profiles
  drop constraint if exists profiles_profile_boost_message_length;

alter table public.profiles
  add constraint profiles_profile_boost_message_length
  check (
    profile_boost_message is null
    or char_length(trim(profile_boost_message)) between 1 and 72
  );

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_moderator() then
    return new;
  end if;

  if old.id is distinct from auth.uid() then
    return new;
  end if;

  if old.role is distinct from new.role then
    new.role := old.role;
  end if;
  if old.is_premium is distinct from new.is_premium then
    new.is_premium := old.is_premium;
  end if;
  if old.is_verified is distinct from new.is_verified then
    new.is_verified := old.is_verified;
  end if;
  if old.trust_score is distinct from new.trust_score then
    new.trust_score := old.trust_score;
  end if;
  if old.news_verification_granted is distinct from new.news_verification_granted then
    new.news_verification_granted := old.news_verification_granted;
  end if;
  if old.reporter_level is distinct from new.reporter_level then
    new.reporter_level := old.reporter_level;
  end if;
  if old.contribution_score is distinct from new.contribution_score then
    new.contribution_score := old.contribution_score;
  end if;
  if old.verified_content_count is distinct from new.verified_content_count then
    new.verified_content_count := old.verified_content_count;
  end if;
  if old.stripe_customer_id is distinct from new.stripe_customer_id then
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  if old.profile_boosted_until is distinct from new.profile_boosted_until then
    new.profile_boosted_until := old.profile_boosted_until;
  end if;
  if old.profile_boost_message is distinct from new.profile_boost_message then
    new.profile_boost_message := old.profile_boost_message;
  end if;
  if old.account_status is distinct from new.account_status then
    new.account_status := old.account_status;
  end if;
  if old.is_guest is distinct from new.is_guest then
    if not (old.is_guest = true and new.is_guest = false) then
      new.is_guest := old.is_guest;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.activate_profile_boost(p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg text;
begin
  if v_uid is null then
    raise exception 'Oturum gerekli';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_uid and is_premium = true
  ) then
    raise exception 'Premium üyelik gerekli';
  end if;

  v_msg := nullif(trim(p_message), '');
  if v_msg is not null and char_length(v_msg) > 72 then
    raise exception 'Kampanya metni en fazla 72 karakter olabilir';
  end if;

  update public.profiles
  set
    profile_boosted_until = now() + interval '7 days',
    profile_boost_message = v_msg,
    updated_at = now()
  where id = v_uid;
end;
$$;

create or replace function public.update_profile_boost_message(p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg text;
begin
  if v_uid is null then
    raise exception 'Oturum gerekli';
  end if;

  v_msg := nullif(trim(p_message), '');
  if v_msg is not null and char_length(v_msg) > 72 then
    raise exception 'Kampanya metni en fazla 72 karakter olabilir';
  end if;

  update public.profiles
  set
    profile_boost_message = v_msg,
    updated_at = now()
  where id = v_uid
    and profile_boosted_until is not null
    and profile_boosted_until > now();
end;
$$;

create or replace function public.cancel_profile_boost()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Oturum gerekli';
  end if;

  update public.profiles
  set
    profile_boosted_until = null,
    profile_boost_message = null,
    updated_at = now()
  where id = v_uid
    and is_premium = true
    and profile_boosted_until is not null
    and profile_boosted_until > now();

  if not found then
    raise exception 'Aktif profil öne çıkarma bulunamadı';
  end if;
end;
$$;

grant execute on function public.activate_profile_boost(text) to authenticated;
grant execute on function public.update_profile_boost_message(text) to authenticated;
grant execute on function public.cancel_profile_boost() to authenticated;
