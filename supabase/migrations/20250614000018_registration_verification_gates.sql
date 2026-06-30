-- Kayıt: profil yalnızca e-posta doğrulandıktan sonra oluşur; işletme sahibi insert RLS

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
  final_username := lower(base_username);

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(base_username) || '_' || substr(md5(random()::text), 1, 4);
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if new.email_confirmed_at is not null then
    perform public.create_user_profile_from_auth(new);
  end if;

  return new;
end;
$$;

create or replace function public.handle_auth_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if old.email_confirmed_at is null
     and new.email_confirmed_at is not null
     and not exists (select 1 from public.profiles where id = new.id) then
    perform public.create_user_profile_from_auth(new);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  execute function public.handle_auth_user_email_confirmed();

create or replace function public.ensure_current_user_profile()
returns uuid
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_user auth.users;
  v_id uuid;
begin
  v_id := auth.uid();
  if v_id is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_id) then
    return v_id;
  end if;

  select * into v_user from auth.users where id = v_id;

  if v_user.email_confirmed_at is null
     and not coalesce((v_user.raw_user_meta_data->>'is_guest')::boolean, false)
     and not public.is_guest_auth_email(v_user.email) then
    raise exception 'email not confirmed';
  end if;

  perform public.create_user_profile_from_auth(v_user);
  return v_id;
end;
$$;

-- Onaysız (misafir olmayan) hesaplara ait profilleri kaldır
delete from public.profiles p
using auth.users u
where p.id = u.id
  and u.email_confirmed_at is null
  and not coalesce((u.raw_user_meta_data->>'is_guest')::boolean, false)
  and not public.is_guest_auth_email(u.email);

drop policy if exists "businesses_owner_insert" on public.businesses;
create policy "businesses_owner_insert" on public.businesses
  for insert
  to authenticated
  with check (auth.uid() = owner_id);
