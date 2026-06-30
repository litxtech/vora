-- Kullanıcı adında nokta ve tireye izin ver (alt çizgi zaten vardı); diğer özel karakterler yasak.

create or replace function public.normalize_and_validate_profile_username()
returns trigger
language plpgsql
as $$
declare
  normalized text;
begin
  if TG_OP = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  normalized := lower(trim(new.username));
  if normalized like '@%' then
    normalized := substring(normalized from 2);
  end if;

  if char_length(normalized) < 4 then
    raise exception 'USERNAME_TOO_SHORT';
  end if;
  if char_length(normalized) > 30 then
    raise exception 'USERNAME_TOO_LONG';
  end if;
  if normalized !~ '^[a-z0-9_.-]+$' then
    raise exception 'USERNAME_INVALID_FORMAT';
  end if;

  new.username := normalized;
  return new;
end;
$$;

-- Otomatik profil oluşturmada e-posta önekinden geçerli karakterleri koru
create or replace function public.create_user_profile_from_auth(p_user auth.users)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  base_username text;
  final_username text;
  meta_birth_date date;
  meta_policy_consents jsonb;
  meta_is_guest boolean;
  meta_first_name text;
  meta_last_name text;
  meta_full_name text;
  meta_gender public.gender_type;
  meta_account_type public.account_type;
begin
  if exists (select 1 from public.profiles where id = p_user.id) then
    return;
  end if;

  base_username := coalesce(
    nullif(trim(p_user.raw_user_meta_data->>'username'), ''),
    split_part(p_user.email, '@', 1)
  );
  final_username := lower(regexp_replace(trim(base_username), '[^a-zA-Z0-9_.-]', '', 'g'));

  if char_length(final_username) < 4 then
    final_username := final_username || '_' || substr(md5(random()::text), 1, 4);
  end if;

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(regexp_replace(trim(base_username), '[^a-zA-Z0-9_.-]', '', 'g'))
      || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  if p_user.raw_user_meta_data->>'birth_date' is not null then
    meta_birth_date := (p_user.raw_user_meta_data->>'birth_date')::date;
  end if;

  meta_policy_consents := coalesce(p_user.raw_user_meta_data->'policy_consents', '{}'::jsonb);
  meta_is_guest := coalesce((p_user.raw_user_meta_data->>'is_guest')::boolean, false);
  meta_first_name := nullif(trim(p_user.raw_user_meta_data->>'first_name'), '');
  meta_last_name := nullif(trim(p_user.raw_user_meta_data->>'last_name'), '');
  meta_full_name := coalesce(
    nullif(trim(p_user.raw_user_meta_data->>'full_name'), ''),
    trim(concat_ws(' ', meta_first_name, meta_last_name))
  );

  if p_user.raw_user_meta_data->>'gender' is not null then
    meta_gender := (p_user.raw_user_meta_data->>'gender')::public.gender_type;
  end if;

  if p_user.raw_user_meta_data->>'account_type' is not null then
    meta_account_type := (p_user.raw_user_meta_data->>'account_type')::public.account_type;
  else
    meta_account_type := 'personal';
  end if;

  insert into public.profiles (
    id, username, full_name, first_name, last_name, birth_date,
    policy_consents, is_guest, gender, account_type, publisher_key
  )
  values (
    p_user.id,
    final_username,
    meta_full_name,
    meta_first_name,
    meta_last_name,
    meta_birth_date,
    meta_policy_consents,
    meta_is_guest,
    meta_gender,
    meta_account_type,
    public.generate_publisher_key()
  );
end;
$$;
