-- Heyet: yolculuk / pazar / otel uyuşmazlık sohbet odaları (trip sohbet benzeri grup)

create type public.heyet_subject_type as enum (
  'ride_reservation',
  'marketplace_order',
  'hotel_reservation'
);

create type public.heyet_status as enum (
  'open',
  'closed'
);

create table public.heyet_cases (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  subject_type public.heyet_subject_type not null,
  subject_id uuid not null,
  party_a_id uuid not null references public.profiles (id) on delete restrict,
  party_b_id uuid not null references public.profiles (id) on delete restrict,
  opened_by uuid not null references public.profiles (id) on delete restrict,
  status public.heyet_status not null default 'open',
  decision_text text,
  decision_by uuid references public.profiles (id) on delete set null,
  decision_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint heyet_cases_subject_unique unique (subject_type, subject_id)
);

create index heyet_cases_party_a_idx on public.heyet_cases (party_a_id, status, created_at desc);
create index heyet_cases_party_b_idx on public.heyet_cases (party_b_id, status, created_at desc);
create index heyet_cases_status_idx on public.heyet_cases (status, created_at desc);

alter table public.heyet_cases enable row level security;

create policy heyet_cases_member_read on public.heyet_cases
  for select using (
    exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = heyet_cases.conversation_id
        and cm.user_id = auth.uid()
    )
  );

create policy heyet_cases_admin_read on public.heyet_cases
  for select using (public.is_admin());

-- ─── Konu taraflarını çöz ────────────────────────────────────────────────────

create or replace function public.resolve_heyet_subject(
  p_subject_type public.heyet_subject_type,
  p_subject_id uuid
)
returns table (
  party_a_id uuid,
  party_b_id uuid,
  title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_subject_type = 'ride_reservation' then
    return query
    select
      rr.passenger_id,
      t.driver_id,
      'Heyet · Yolculuk ' || left(rr.id::text, 8)
    from public.ride_reservations rr
    join public.ride_trips t on t.id = rr.trip_id
    where rr.id = p_subject_id;
    return;
  end if;

  if p_subject_type = 'marketplace_order' then
    return query
    select
      mo.buyer_id,
      mo.seller_id,
      'Heyet · ' || mo.order_number
    from public.marketplace_orders mo
    where mo.id = p_subject_id;
    return;
  end if;

  if p_subject_type = 'hotel_reservation' then
    return query
    select
      hr.guest_id,
      hr.owner_id,
      'Heyet · ' || hr.reservation_code
    from public.hotel_reservations hr
    where hr.id = p_subject_id;
    return;
  end if;

  raise exception 'Geçersiz heyet konusu';
end;
$$;

-- ─── Heyet aç / mevcut odaya yönlendir ─────────────────────────────────────

create or replace function public.admin_open_heyet(
  p_subject_type public.heyet_subject_type,
  p_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_existing public.heyet_cases%rowtype;
  v_party_a uuid;
  v_party_b uuid;
  v_title text;
  v_conversation_id uuid;
  v_welcome text;
begin
  if v_admin_id is null then
    raise exception 'Oturum gerekli';
  end if;
  if not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_existing
  from public.heyet_cases
  where subject_type = p_subject_type
    and subject_id = p_subject_id;

  if found then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_existing.conversation_id, v_admin_id, 'member')
    on conflict do nothing;
    return v_existing.conversation_id;
  end if;

  select r.party_a_id, r.party_b_id, r.title
  into v_party_a, v_party_b, v_title
  from public.resolve_heyet_subject(p_subject_type, p_subject_id) r;

  if v_party_a is null or v_party_b is null then
    raise exception 'Kayıt bulunamadı veya taraflar çözülemedi';
  end if;

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_admin_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values
    (v_conversation_id, v_admin_id, 'founder'),
    (v_conversation_id, v_party_a, 'member'),
    (v_conversation_id, v_party_b, 'member')
  on conflict do nothing;

  insert into public.heyet_cases (
    conversation_id,
    subject_type,
    subject_id,
    party_a_id,
    party_b_id,
    opened_by,
    status
  )
  values (
    v_conversation_id,
    p_subject_type,
    p_subject_id,
    v_party_a,
    v_party_b,
    v_admin_id,
    'open'
  );

  v_welcome :=
    'Vora Heyet oturumu başlatıldı. Her iki taraf da yaşanan sorunu, kanıtları ve taleplerinizi burada paylaşabilirsiniz. '
    || 'İnceleme sonrası karar bu sohbette açıklanacaktır.';

  insert into public.messages (conversation_id, sender_id, content, message_type)
  values (v_conversation_id, v_admin_id, v_welcome, 'text');

  return v_conversation_id;
end;
$$;

-- ─── Kapat / yeniden aç ────────────────────────────────────────────────────

create or replace function public.admin_close_heyet(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.heyet_cases%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_case from public.heyet_cases where id = p_case_id for update;
  if not found then
    raise exception 'Heyet bulunamadı';
  end if;

  update public.heyet_cases
  set status = 'closed',
      closed_at = now()
  where id = p_case_id;

  insert into public.messages (conversation_id, sender_id, content, message_type)
  values (
    v_case.conversation_id,
    auth.uid(),
    'Heyet oturumu kapatıldı. Yeni mesaj gönderilemez. Admin dilerse oturumu yeniden açabilir.',
    'text'
  );
end;
$$;

create or replace function public.admin_reopen_heyet(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.heyet_cases%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_case from public.heyet_cases where id = p_case_id for update;
  if not found then
    raise exception 'Heyet bulunamadı';
  end if;

  update public.heyet_cases
  set status = 'open',
      closed_at = null
  where id = p_case_id;

  insert into public.messages (conversation_id, sender_id, content, message_type)
  values (
    v_case.conversation_id,
    auth.uid(),
    'Heyet oturumu yeniden açıldı. Taraflar tekrar mesaj gönderebilir.',
    'text'
  );
end;
$$;

-- ─── Karar açıklama ────────────────────────────────────────────────────────

create or replace function public.admin_post_heyet_decision(
  p_case_id uuid,
  p_decision_text text,
  p_close_after boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.heyet_cases%rowtype;
  v_body text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  if length(trim(coalesce(p_decision_text, ''))) < 10 then
    raise exception 'Karar açıklaması en az 10 karakter olmalı';
  end if;

  select * into v_case from public.heyet_cases where id = p_case_id for update;
  if not found then
    raise exception 'Heyet bulunamadı';
  end if;

  v_body := '📋 Heyet Kararı' || E'\n\n' || trim(p_decision_text);

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    metadata
  )
  values (
    v_case.conversation_id,
    auth.uid(),
    v_body,
    'text',
    jsonb_build_object('kind', 'heyet_decision')
  );

  update public.heyet_cases
  set decision_text = trim(p_decision_text),
      decision_by = auth.uid(),
      decision_at = now(),
      status = case when p_close_after then 'closed'::public.heyet_status else status end,
      closed_at = case when p_close_after then now() else closed_at end
  where id = p_case_id;
end;
$$;

-- ─── Sorgular ──────────────────────────────────────────────────────────────

create or replace function public.get_heyet_case_by_subject(
  p_subject_type public.heyet_subject_type,
  p_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.heyet_cases%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_row
  from public.heyet_cases
  where subject_type = p_subject_type
    and subject_id = p_subject_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'conversation_id', v_row.conversation_id,
    'subject_type', v_row.subject_type,
    'subject_id', v_row.subject_id,
    'party_a_id', v_row.party_a_id,
    'party_b_id', v_row.party_b_id,
    'opened_by', v_row.opened_by,
    'status', v_row.status,
    'decision_text', v_row.decision_text,
    'decision_by', v_row.decision_by,
    'decision_at', v_row.decision_at,
    'closed_at', v_row.closed_at,
    'created_at', v_row.created_at
  );
end;
$$;

create or replace function public.get_heyet_case_for_conversation(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.heyet_cases%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  ) and not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_row
  from public.heyet_cases
  where conversation_id = p_conversation_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'conversation_id', v_row.conversation_id,
    'subject_type', v_row.subject_type,
    'subject_id', v_row.subject_id,
    'party_a_id', v_row.party_a_id,
    'party_b_id', v_row.party_b_id,
    'opened_by', v_row.opened_by,
    'status', v_row.status,
    'decision_text', v_row.decision_text,
    'decision_by', v_row.decision_by,
    'decision_at', v_row.decision_at,
    'closed_at', v_row.closed_at,
    'created_at', v_row.created_at
  );
end;
$$;

-- ─── Kapalı heyette mesaj engeli ───────────────────────────────────────────

create or replace function public.send_message(
  p_conversation_id uuid,
  p_content text default '',
  p_message_type public.message_type default 'text',
  p_media_url text default null,
  p_reply_to_id uuid default null,
  p_forwarded_from_id uuid default null,
  p_metadata jsonb default null
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  media_url text,
  message_type public.message_type,
  metadata jsonb,
  reply_to_id uuid,
  forwarded_from_id uuid,
  edited_at timestamptz,
  deleted_for_all boolean,
  is_read boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.messages%rowtype;
  v_other_id uuid;
  v_type public.conversation_type;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = v_user_id
  ) then
    raise exception 'Bu sohbete mesaj gönderemezsiniz';
  end if;

  if exists (
    select 1
    from public.heyet_cases hc
    where hc.conversation_id = p_conversation_id
      and hc.status = 'closed'
  ) and not public.is_admin() then
    raise exception 'Heyet kapatıldı — mesaj gönderilemez';
  end if;

  select c.type into v_type
  from public.conversations c
  where c.id = p_conversation_id;

  if v_type = 'direct' then
    select cm.user_id into v_other_id
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> v_user_id
    limit 1;

    if v_other_id is not null then
      perform public.assert_direct_communication_allowed(v_user_id, v_other_id);
    end if;
  end if;

  if p_reply_to_id is not null and not exists (
    select 1
    from public.messages m
    where m.id = p_reply_to_id
      and m.conversation_id = p_conversation_id
  ) then
    p_reply_to_id := null;
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    media_url,
    message_type,
    reply_to_id,
    forwarded_from_id,
    metadata
  )
  values (
    p_conversation_id,
    v_user_id,
    coalesce(p_content, ''),
    p_media_url,
    p_message_type,
    p_reply_to_id,
    p_forwarded_from_id,
    p_metadata
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_row.conversation_id,
    v_row.sender_id,
    v_row.content,
    v_row.media_url,
    v_row.message_type,
    v_row.metadata,
    v_row.reply_to_id,
    v_row.forwarded_from_id,
    v_row.edited_at,
    v_row.deleted_for_all,
    v_row.is_read,
    v_row.created_at;
end;
$$;

grant execute on function public.resolve_heyet_subject(public.heyet_subject_type, uuid) to authenticated, service_role;
grant execute on function public.admin_open_heyet(public.heyet_subject_type, uuid) to authenticated;
grant execute on function public.admin_close_heyet(uuid) to authenticated;
grant execute on function public.admin_reopen_heyet(uuid) to authenticated;
grant execute on function public.admin_post_heyet_decision(uuid, text, boolean) to authenticated;
grant execute on function public.get_heyet_case_by_subject(public.heyet_subject_type, uuid) to authenticated;
grant execute on function public.get_heyet_case_for_conversation(uuid) to authenticated;
