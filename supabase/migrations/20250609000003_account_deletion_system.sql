-- Hesap silme sistemi: 7 gün bekleme, anonimleştirme, platform/kullanıcı kaynağı

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'frozen', 'deletion_pending', 'deleted'));

alter table public.profiles drop constraint if exists profiles_deleted_by_check;
alter table public.profiles
  add constraint profiles_deleted_by_check
  check (deleted_by is null or deleted_by in ('self', 'platform'));

create index if not exists profiles_deletion_pending_idx
  on public.profiles (deletion_requested_at)
  where account_status = 'deletion_pending';

create or replace function public.finalize_account_deletion(
  p_user_id uuid,
  p_deleted_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_deleted_by not in ('self', 'platform') then
    raise exception 'Geçersiz silme kaynağı';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Kullanıcı bulunamadı';
  end if;

  update public.posts
  set status = 'removed', updated_at = now()
  where author_id = p_user_id and status = 'published';

  update public.reels
  set status = 'removed', updated_at = now()
  where author_id = p_user_id and status = 'published';

  update public.profiles
  set
    account_status = 'deleted',
    deleted_at = now(),
    deleted_by = p_deleted_by,
    deletion_requested_at = null,
    avatar_url = null,
    cover_url = null,
    bio = null,
    full_name = null,
    first_name = null,
    last_name = null,
    occupation = null,
    interests = '{}',
    address = null,
    iban = null,
    bank_name = null,
    bank_account_name = null,
    birth_date = null,
    district = null,
    region_id = null,
    username = 'deleted_' || substr(p_user_id::text, 1, 8),
    is_verified = false,
    is_premium = false,
    is_guest = false,
    profile_boosted_until = null,
    stripe_customer_id = null,
    notification_prefs = '{}'::jsonb,
    messaging_prefs = '{}'::jsonb,
    quiet_hours = '{}'::jsonb,
    updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  update public.profiles
  set
    account_status = 'deletion_pending',
    deletion_requested_at = now(),
    updated_at = now()
  where id = v_user_id
    and account_status = 'active';

  if not found then
    raise exception 'Hesap silme talebi oluşturulamadı';
  end if;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Oturum bulunamadı';
  end if;

  update public.profiles
  set
    account_status = 'active',
    deletion_requested_at = null,
    updated_at = now()
  where id = v_user_id
    and account_status = 'deletion_pending';

  if not found then
    raise exception 'Aktif silme talebi bulunamadı';
  end if;
end;
$$;

create or replace function public.process_pending_account_deletions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select id
    from public.profiles
    where account_status = 'deletion_pending'
      and deletion_requested_at is not null
      and deletion_requested_at < now() - interval '7 days'
  loop
    perform public.finalize_account_deletion(v_row.id, 'self');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.admin_delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz işlem';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Kendi hesabınızı bu yöntemle silemezsiniz';
  end if;

  perform public.finalize_account_deletion(p_user_id, 'platform');
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.admin_delete_user_account(uuid) to authenticated;
