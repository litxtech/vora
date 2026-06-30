-- Eksik profil satırını oturum açmış kullanıcı için oluşturur (auth.users -> profiles)

create or replace function public.ensure_current_user_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_id uuid;
  base_username text;
  final_username text;
begin
  v_id := auth.uid();
  if v_id is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_id) then
    return v_id;
  end if;

  select * into v_user from auth.users where id = v_id;

  base_username := coalesce(
    nullif(trim(v_user.raw_user_meta_data->>'username'), ''),
    split_part(v_user.email, '@', 1),
    'user'
  );
  final_username := lower(base_username);

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(base_username) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (
    id,
    username,
    full_name,
    is_guest,
    account_type,
    onboarding_completed
  )
  values (
    v_id,
    final_username,
    nullif(trim(v_user.raw_user_meta_data->>'full_name'), ''),
    coalesce((v_user.raw_user_meta_data->>'is_guest')::boolean, false),
    coalesce((v_user.raw_user_meta_data->>'account_type')::public.account_type, 'personal'),
    false
  );

  return v_id;
end;
$$;

grant execute on function public.ensure_current_user_profile() to authenticated;
