-- Kayıt sırasında verilen yasal onayların saklanması

alter table public.profiles
  add column if not exists policy_consents jsonb not null default '{}';

-- handle_new_user: politika onaylarını profile aktar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  meta_birth_date date;
  meta_policy_consents jsonb;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );
  final_username := lower(base_username);

  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := lower(base_username) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  if new.raw_user_meta_data->>'birth_date' is not null then
    meta_birth_date := (new.raw_user_meta_data->>'birth_date')::date;
  end if;

  meta_policy_consents := coalesce(new.raw_user_meta_data->'policy_consents', '{}'::jsonb);

  insert into public.profiles (id, username, full_name, birth_date, policy_consents)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data->>'full_name',
    meta_birth_date,
    meta_policy_consents
  );

  return new;
end;
$$;
