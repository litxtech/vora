-- Bireysel kimlik doğrulama: başvuru tablosu, private storage, admin RPC'leri

create type public.identity_verification_status as enum (
  'pending',
  'in_review',
  'approved',
  'rejected'
);

create type public.identity_document_type as enum (
  'national_id',
  'passport',
  'drivers_license'
);

create table public.identity_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.identity_verification_status not null default 'pending',
  document_type public.identity_document_type not null,
  full_name text not null,
  birth_date date,
  id_front_path text not null,
  id_back_path text,
  selfie_path text not null,
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index identity_verification_requests_user_idx
  on public.identity_verification_requests (user_id, created_at desc);

create index identity_verification_requests_status_idx
  on public.identity_verification_requests (status, created_at desc);

create unique index identity_verification_one_active_per_user
  on public.identity_verification_requests (user_id)
  where status in ('pending', 'in_review');

-- ─── Storage: kimlik belgeleri (private) ─────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists "Kimlik belgeleri sahibi okuyabilir" on storage.objects;
create policy "Kimlik belgeleri sahibi okuyabilir"
on storage.objects for select
to authenticated
using (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Kimlik belgeleri sahibi yükleyebilir" on storage.objects;
create policy "Kimlik belgeleri sahibi yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Kimlik belgeleri admin okuyabilir" on storage.objects;
create policy "Kimlik belgeleri admin okuyabilir"
on storage.objects for select
to authenticated
using (
  bucket_id = 'identity-documents'
  and public.is_admin()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.identity_verification_requests enable row level security;

drop policy if exists "identity_verification_own_read" on public.identity_verification_requests;
create policy "identity_verification_own_read"
  on public.identity_verification_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ─── Kullanıcı: başvuru gönder ───────────────────────────────────────────────

create or replace function public.submit_identity_verification_request(
  p_document_type public.identity_document_type,
  p_full_name text,
  p_birth_date date,
  p_id_front_path text,
  p_id_back_path text,
  p_selfie_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and is_verified = true
  ) then
    raise exception 'Hesabınız zaten doğrulanmış';
  end if;

  if exists (
    select 1 from public.identity_verification_requests
    where user_id = v_user_id and status in ('pending', 'in_review')
  ) then
    raise exception 'Bekleyen bir başvurunuz var';
  end if;

  if trim(p_full_name) = '' then
    raise exception 'Ad soyad gereklidir';
  end if;

  if p_document_type <> 'passport' and coalesce(trim(p_id_back_path), '') = '' then
    raise exception 'Kimlik arka yüz fotoğrafı gereklidir';
  end if;

  if (split_part(p_id_front_path, '/', 1) <> v_user_id::text
     or split_part(p_selfie_path, '/', 1) <> v_user_id::text) then
    raise exception 'Geçersiz belge yolu';
  end if;

  if coalesce(trim(p_id_back_path), '') <> ''
     and split_part(p_id_back_path, '/', 1) <> v_user_id::text then
    raise exception 'Geçersiz belge yolu';
  end if;

  insert into public.identity_verification_requests (
    user_id,
    document_type,
    full_name,
    birth_date,
    id_front_path,
    id_back_path,
    selfie_path
  )
  values (
    v_user_id,
    p_document_type,
    trim(p_full_name),
    p_birth_date,
    p_id_front_path,
    nullif(trim(p_id_back_path), ''),
    p_selfie_path
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- ─── Admin: listele / onayla / reddet ────────────────────────────────────────

create or replace function public.admin_list_identity_verifications(
  p_status public.identity_verification_status default null,
  p_limit int default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  status public.identity_verification_status,
  document_type public.identity_document_type,
  applicant_name text,
  birth_date date,
  id_front_path text,
  id_back_path text,
  selfie_path text,
  rejection_reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    r.id,
    r.user_id,
    p.username,
    p.full_name,
    r.status,
    r.document_type,
    r.full_name as applicant_name,
    r.birth_date,
    r.id_front_path,
    r.id_back_path,
    r.selfie_path,
    r.rejection_reason,
    r.created_at
  from public.identity_verification_requests r
  join public.profiles p on p.id = r.user_id
  where p_status is null or r.status = p_status
  order by
    case r.status when 'pending' then 0 when 'in_review' then 1 else 2 end,
    r.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_approve_identity_verification(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.identity_verification_requests
  set
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id
    and status in ('pending', 'in_review')
  returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'Başvuru bulunamadı veya zaten işlenmiş';
  end if;

  update public.profiles
  set is_verified = true, updated_at = now()
  where id = v_user_id;

  insert into public.user_badges (user_id, badge_type)
  values (v_user_id, 'verified_account')
  on conflict (user_id, badge_type) do nothing;
end;
$$;

create or replace function public.admin_reject_identity_verification(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Red gerekçesi zorunludur';
  end if;

  update public.identity_verification_requests
  set
    status = 'rejected',
    rejection_reason = trim(p_reason),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id
    and status in ('pending', 'in_review');

  if not found then
    raise exception 'Başvuru bulunamadı veya zaten işlenmiş';
  end if;
end;
$$;

-- ─── Dashboard: bekleyen kimlik başvuruları ──────────────────────────────────

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_today timestamptz := date_trunc('day', now());
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'active_users', (
      select count(*)::int from public.profiles
      where account_status = 'active'
        and coalesce(last_seen_at, updated_at) > now() - interval '7 days'
    ),
    'daily_registrations', (select count(*)::int from public.profiles where created_at >= v_today),
    'daily_posts', (select count(*)::int from public.posts where created_at >= v_today),
    'daily_comments', (select count(*)::int from public.post_comments where created_at >= v_today),
    'daily_messages', (select count(*)::int from public.messages where created_at >= v_today),
    'pending_reports', (select count(*)::int from public.content_reports where status = 'pending'),
    'pending_verifications', (select count(*)::int from public.businesses where registration_status = 'pending'),
    'pending_identity_verifications', (
      select count(*)::int from public.identity_verification_requests
      where status in ('pending', 'in_review')
    ),
    'pending_reporter_apps', (select count(*)::int from public.reporter_applications where status = 'pending'),
    'pending_ads', (select count(*)::int from public.business_ads where status = 'pending'),
    'pending_appeals', (select count(*)::int from public.moderation_appeals where status = 'pending'),
    'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
    'disputed_vcts', (select count(*)::int from public.content_trust_records where status = 'disputed'),
    'pending_post_verifications', (select count(*)::int from public.post_verifications where status = 'reviewing'),
    'ai_review_queue', (select count(*)::int from public.ai_moderation_logs where action = 'review' and reviewed_at is null)
  ) into v_result;

  return v_result;
end;
$$;

-- ─── Grants ───────────────────────────────────────────────────────────────────

grant execute on function public.submit_identity_verification_request to authenticated;
grant execute on function public.admin_list_identity_verifications to authenticated;
grant execute on function public.admin_approve_identity_verification to authenticated;
grant execute on function public.admin_reject_identity_verification to authenticated;
