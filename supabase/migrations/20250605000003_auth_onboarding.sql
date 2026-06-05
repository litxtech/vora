-- Auth & onboarding alanları

alter table public.profiles
  add column if not exists district text,
  add column if not exists occupation text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists notification_prefs jsonb not null default '{}',
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'frozen', 'deletion_pending'));

create index if not exists profiles_onboarding_idx on public.profiles (onboarding_completed);
create index if not exists profiles_account_status_idx on public.profiles (account_status);

-- handle_new_user: doğum tarihi ve tam ad desteği
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

  insert into public.profiles (id, username, full_name, birth_date)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data->>'full_name',
    meta_birth_date
  );

  return new;
end;
$$;
