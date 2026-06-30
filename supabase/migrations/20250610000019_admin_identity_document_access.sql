-- Admin/moderator kimlik belgesi okuma erişimi (storage RLS)

drop policy if exists "Kimlik belgeleri admin okuyabilir" on storage.objects;
create policy "Kimlik belgeleri admin okuyabilir"
on storage.objects for select
to authenticated
using (
  bucket_id = 'identity-documents'
  and public.is_moderator()
);

-- Kimlik doğrulama admin RPC'leri moderatör erişimine açılır
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
  if not public.is_moderator() then
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
  if not public.is_moderator() then
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
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Red gerekçesi zorunlu';
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
