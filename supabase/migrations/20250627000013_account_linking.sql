-- Bireysel ↔ işletme hesap bağlama (yalnızca sahibi doğrulanmış çiftler)

create table if not exists public.linked_accounts (
  id uuid primary key default gen_random_uuid(),
  personal_user_id uuid not null references public.profiles (id) on delete cascade,
  business_user_id uuid not null references public.profiles (id) on delete cascade,
  linked_by uuid not null references public.profiles (id) on delete cascade,
  linked_at timestamptz not null default now(),
  constraint linked_accounts_distinct_users check (personal_user_id <> business_user_id),
  constraint linked_accounts_unique_personal unique (personal_user_id),
  constraint linked_accounts_unique_business unique (business_user_id)
);

create index if not exists linked_accounts_personal_idx on public.linked_accounts (personal_user_id);
create index if not exists linked_accounts_business_idx on public.linked_accounts (business_user_id);

alter table public.linked_accounts enable row level security;

drop policy if exists "linked_accounts_participant_select" on public.linked_accounts;
create policy "linked_accounts_participant_select" on public.linked_accounts
  for select
  to authenticated
  using (auth.uid() in (personal_user_id, business_user_id));

-- Bağlantı: karşı tarafın kimliği doğrulandıktan sonra (istemci şifre ile oturum açar)
create or replace function public.create_account_link(p_sibling_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_personal uuid;
  v_business uuid;
  v_self_type public.account_type;
  v_sibling_type public.account_type;
  v_link_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_sibling_user_id = v_uid then
    raise exception 'cannot link self';
  end if;

  select account_type into v_self_type from public.profiles where id = v_uid;
  select account_type into v_sibling_type from public.profiles where id = p_sibling_user_id;

  if v_self_type is null or v_sibling_type is null then
    raise exception 'profile not found';
  end if;

  if v_self_type = v_sibling_type then
    raise exception 'account types must differ';
  end if;

  if v_self_type = 'personal' then
    v_personal := v_uid;
    v_business := p_sibling_user_id;
  else
    v_personal := p_sibling_user_id;
    v_business := v_uid;
  end if;

  if exists (
    select 1 from public.linked_accounts
    where personal_user_id = v_personal or business_user_id = v_business
  ) then
    raise exception 'link already exists';
  end if;

  insert into public.linked_accounts (personal_user_id, business_user_id, linked_by)
  values (v_personal, v_business, v_uid)
  returning id into v_link_id;

  return v_link_id;
end;
$$;

revoke all on function public.create_account_link(uuid) from public;
grant execute on function public.create_account_link(uuid) to authenticated;

-- Bağlı kardeş hesabı (profil özeti)
create or replace function public.get_linked_sibling_profile()
returns table (
  sibling_id uuid,
  sibling_username text,
  sibling_account_type public.account_type,
  sibling_avatar_url text,
  sibling_full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.account_type,
    p.avatar_url,
    p.full_name
  from public.linked_accounts la
  join public.profiles p on p.id = case
    when la.personal_user_id = auth.uid() then la.business_user_id
    when la.business_user_id = auth.uid() then la.personal_user_id
    else null
  end
  where auth.uid() in (la.personal_user_id, la.business_user_id)
  limit 1;
$$;

revoke all on function public.get_linked_sibling_profile() from public;
grant execute on function public.get_linked_sibling_profile() to authenticated;
