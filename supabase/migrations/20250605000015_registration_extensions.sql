-- Kayıt genişletmeleri: bireysel / işletme, cinsiyet, belgeler

create type public.gender_type as enum ('female', 'male', 'other', 'prefer_not_to_say');
create type public.account_type as enum ('personal', 'business');
create type public.business_registration_status as enum ('pending', 'approved', 'rejected');

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists gender public.gender_type,
  add column if not exists account_type public.account_type not null default 'personal';

alter table public.businesses
  add column if not exists registration_status public.business_registration_status not null default 'pending',
  add column if not exists tax_number text,
  add column if not exists email text,
  add column if not exists district text,
  add column if not exists website text,
  add column if not exists document_urls text[] not null default '{}';

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
  meta_is_guest boolean;
  meta_first_name text;
  meta_last_name text;
  meta_full_name text;
  meta_gender public.gender_type;
  meta_account_type public.account_type;
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
  meta_is_guest := coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false);
  meta_first_name := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  meta_last_name := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  meta_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    trim(concat_ws(' ', meta_first_name, meta_last_name))
  );

  if new.raw_user_meta_data->>'gender' is not null then
    meta_gender := (new.raw_user_meta_data->>'gender')::public.gender_type;
  end if;

  if new.raw_user_meta_data->>'account_type' is not null then
    meta_account_type := (new.raw_user_meta_data->>'account_type')::public.account_type;
  else
    meta_account_type := 'personal';
  end if;

  insert into public.profiles (
    id, username, full_name, first_name, last_name, birth_date,
    policy_consents, is_guest, gender, account_type
  )
  values (
    new.id,
    final_username,
    meta_full_name,
    meta_first_name,
    meta_last_name,
    meta_birth_date,
    meta_policy_consents,
    meta_is_guest,
    meta_gender,
    meta_account_type
  );

  return new;
end;
$$;

-- İşletme kayıt belgeleri
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-documents',
  'business-documents',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

drop policy if exists "İşletme belgeleri sahibi okuyabilir" on storage.objects;
create policy "İşletme belgeleri sahibi okuyabilir"
on storage.objects for select
to authenticated
using (
  bucket_id = 'business-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "İşletme belgeleri sahibi yükleyebilir" on storage.objects;
create policy "İşletme belgeleri sahibi yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "İşletme belgeleri sahibi silebilir" on storage.objects;
create policy "İşletme belgeleri sahibi silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
