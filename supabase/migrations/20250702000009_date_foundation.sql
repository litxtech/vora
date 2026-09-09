-- Date — sosyal buluşma istekleri (İzdivaç'tan bağımsız)

alter type public.notification_event_type add value if not exists 'date_join_request_received';
alter type public.notification_event_type add value if not exists 'date_join_request_approved';
alter type public.notification_event_type add value if not exists 'date_join_request_declined';
alter type public.notification_event_type add value if not exists 'date_outing_full';
alter type public.notification_event_type add value if not exists 'date_outing_cancelled';

do $$ begin
  create type public.date_status as enum ('open', 'full', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.date_join_status as enum ('pending', 'approved', 'declined', 'withdrawn');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.date_sought_gender as enum ('female', 'male', 'any', 'mixed');
exception when duplicate_object then null;
end $$;

-- ─── Erişim: 18+, profil tamamlanmış, cinsiyet zorunlu ─────────────────────

create or replace function public.date_has_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and coalesce(p.onboarding_completed, false) = true
      and p.gender in ('female', 'male')
      and p.birth_date is not null
      and p.birth_date <= (current_date - interval '18 years')
  );
$$;

create table if not exists public.date_outings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  activity text not null,
  destination text not null,
  looking_for text not null,
  category text,
  organizer_count integer not null default 1,
  seeking_count integer not null default 1,
  approved_count integer not null default 0,
  sought_gender public.date_sought_gender not null,
  scheduled_at timestamptz,
  description text,
  status public.date_status not null default 'open',
  region_id text references public.regions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint date_outings_title_len check (char_length(trim(title)) between 2 and 120),
  constraint date_outings_activity_len check (char_length(trim(activity)) between 2 and 120),
  constraint date_outings_destination_len check (char_length(trim(destination)) between 2 and 160),
  constraint date_outings_looking_for_len check (char_length(trim(looking_for)) between 2 and 200),
  constraint date_outings_organizer_count check (organizer_count between 1 and 20),
  constraint date_outings_seeking_count check (seeking_count between 1 and 20),
  constraint date_outings_approved_count_nonneg check (approved_count >= 0)
);

create index if not exists date_outings_status_idx
  on public.date_outings (status, created_at desc)
  where status = 'open';

create index if not exists date_outings_creator_idx
  on public.date_outings (creator_id, created_at desc);

create index if not exists date_outings_region_idx
  on public.date_outings (region_id, created_at desc);

create table if not exists public.date_organizers (
  outing_id uuid not null references public.date_outings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_creator boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (outing_id, user_id)
);

create index if not exists date_organizers_user_idx
  on public.date_organizers (user_id, added_at desc);

create table if not exists public.date_join_requests (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.date_outings (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  companion_user_id uuid references public.profiles (id) on delete cascade,
  message text,
  seats_requested integer not null default 1,
  status public.date_join_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint date_join_requests_seats check (seats_requested between 1 and 2),
  constraint date_join_requests_companion_distinct check (
    companion_user_id is null or companion_user_id is distinct from requester_id
  )
);

create index if not exists date_join_requests_outing_idx
  on public.date_join_requests (outing_id, status, created_at desc);

create index if not exists date_join_requests_requester_idx
  on public.date_join_requests (requester_id, created_at desc);

create unique index if not exists date_join_requests_one_pending_per_user
  on public.date_join_requests (outing_id, requester_id)
  where status = 'pending';

create table if not exists public.date_approved_members (
  outing_id uuid not null references public.date_outings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  join_request_id uuid references public.date_join_requests (id) on delete set null,
  approved_at timestamptz not null default now(),
  primary key (outing_id, user_id)
);

create index if not exists date_approved_members_user_idx
  on public.date_approved_members (user_id, approved_at desc);

create table if not exists public.date_outing_conversations (
  outing_id uuid primary key references public.date_outings (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade
);

-- ─── Yardımcılar ─────────────────────────────────────────────────────────────

create or replace function public.date_user_gender_ok(p_user_id uuid, p_sought public.date_sought_gender)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_sought in ('any', 'mixed') then exists (
      select 1 from public.profiles p
      where p.id = p_user_id and p.gender in ('female', 'male')
    )
    when p_sought = 'female' then exists (
      select 1 from public.profiles p where p.id = p_user_id and p.gender = 'female'
    )
    when p_sought = 'male' then exists (
      select 1 from public.profiles p where p.id = p_user_id and p.gender = 'male'
    )
    else false
  end;
$$;

create or replace function public.date_sync_outing_status(p_outing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seeking integer;
  v_approved integer;
begin
  select seeking_count, approved_count
  into v_seeking, v_approved
  from public.date_outings
  where id = p_outing_id
  for update;

  if not found then return; end if;

  if v_approved >= v_seeking then
    update public.date_outings
    set status = 'full', updated_at = now()
    where id = p_outing_id and status = 'open';
  end if;
end;
$$;

create or replace function public.ensure_date_outing_conversation(p_outing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outing public.date_outings;
  v_conversation_id uuid;
  v_member_id uuid;
  v_title text;
begin
  select conversation_id into v_conversation_id
  from public.date_outing_conversations
  where outing_id = p_outing_id;

  if v_conversation_id is not null then
    for v_member_id in
      select user_id from public.date_organizers where outing_id = p_outing_id
      union
      select user_id from public.date_approved_members where outing_id = p_outing_id
    loop
      insert into public.conversation_members (conversation_id, user_id, role)
      values (v_conversation_id, v_member_id, 'member')
      on conflict do nothing;
    end loop;

    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, (select creator_id from public.date_outings where id = p_outing_id), 'founder')
    on conflict do nothing;

    return v_conversation_id;
  end if;

  select * into v_outing from public.date_outings where id = p_outing_id;
  if not found then raise exception 'Date bulunamadı'; end if;

  v_title := left(trim(v_outing.title) || ' · Date', 80);

  insert into public.conversations (type, title, created_by)
  values ('group', v_title, v_outing.creator_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_outing.creator_id, 'founder');

  for v_member_id in
    select user_id from public.date_organizers
    where outing_id = p_outing_id and user_id <> v_outing.creator_id
    union
    select user_id from public.date_approved_members where outing_id = p_outing_id
  loop
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, v_member_id, 'member')
    on conflict do nothing;
  end loop;

  insert into public.date_outing_conversations (outing_id, conversation_id)
  values (p_outing_id, v_conversation_id);

  return v_conversation_id;
end;
$$;

-- ─── RPC: date oluştur ───────────────────────────────────────────────────────

create or replace function public.date_create_outing(
  p_title text,
  p_activity text,
  p_destination text,
  p_looking_for text,
  p_organizer_count integer,
  p_seeking_count integer,
  p_sought_gender public.date_sought_gender,
  p_category text default null,
  p_scheduled_at timestamptz default null,
  p_description text default null,
  p_region_id text default null,
  p_organizer_user_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_outing_id uuid;
  v_org_id uuid;
begin
  if not public.date_has_access(v_me) then
    raise exception 'Date özelliğine erişmek için 18+, tamamlanmış profil ve cinsiyet bilgisi gerekir';
  end if;

  if p_sought_gender is null then
    raise exception 'Aranan cinsiyet zorunludur';
  end if;

  insert into public.date_outings (
    creator_id, title, activity, destination, looking_for, category,
    organizer_count, seeking_count, sought_gender, scheduled_at, description, region_id
  )
  values (
    v_me,
    trim(p_title),
    trim(p_activity),
    trim(p_destination),
    trim(p_looking_for),
    nullif(trim(coalesce(p_category, '')), ''),
    greatest(1, coalesce(p_organizer_count, 1)),
    greatest(1, coalesce(p_seeking_count, 1)),
    p_sought_gender,
    p_scheduled_at,
    nullif(trim(coalesce(p_description, '')), ''),
    p_region_id
  )
  returning id into v_outing_id;

  insert into public.date_organizers (outing_id, user_id, is_creator)
  values (v_outing_id, v_me, true);

  foreach v_org_id in array coalesce(p_organizer_user_ids, '{}'::uuid[])
  loop
    if v_org_id is null or v_org_id = v_me then continue; end if;
    if not public.date_has_access(v_org_id) then continue; end if;
    insert into public.date_organizers (outing_id, user_id, is_creator)
    values (v_outing_id, v_org_id, false)
    on conflict do nothing;
  end loop;

  return v_outing_id;
end;
$$;

-- ─── RPC: katılım isteği ─────────────────────────────────────────────────────

create or replace function public.date_send_join_request(
  p_outing_id uuid,
  p_message text default null,
  p_companion_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_outing public.date_outings;
  v_request_id uuid;
  v_seats integer := 1;
  v_creator_id uuid;
begin
  if not public.date_has_access(v_me) then
    raise exception 'Date özelliğine erişmek için 18+, tamamlanmış profil ve cinsiyet bilgisi gerekir';
  end if;

  select * into v_outing from public.date_outings where id = p_outing_id for update;
  if not found then raise exception 'Date bulunamadı'; end if;
  if v_outing.status <> 'open' then raise exception 'Bu date artık istek kabul etmiyor'; end if;

  if exists (
    select 1 from public.date_organizers
    where outing_id = p_outing_id and user_id = v_me
  ) then
    raise exception 'Kendi date''inize katılım isteği gönderemezsiniz';
  end if;

  if exists (
    select 1 from public.date_approved_members
    where outing_id = p_outing_id and user_id = v_me
  ) then
    raise exception 'Zaten bu date''e katıldınız';
  end if;

  if not public.date_user_gender_ok(v_me, v_outing.sought_gender) then
    raise exception 'Bu date için aranan cinsiyet kriterine uymuyorsunuz';
  end if;

  if p_companion_user_id is not null then
    if p_companion_user_id = v_me then
      raise exception 'Geçersiz arkadaş seçimi';
    end if;
    if not public.date_has_access(p_companion_user_id) then
      raise exception 'Arkadaşınız Date kriterlerini karşılamıyor';
    end if;
    if not public.date_user_gender_ok(p_companion_user_id, v_outing.sought_gender) then
      raise exception 'Arkadaşınız bu date için aranan cinsiyet kriterine uymuyor';
    end if;
    if exists (
      select 1 from public.date_organizers
      where outing_id = p_outing_id and user_id = p_companion_user_id
    ) or exists (
      select 1 from public.date_approved_members
      where outing_id = p_outing_id and user_id = p_companion_user_id
    ) then
      raise exception 'Arkadaşınız zaten bu date''te';
    end if;
    v_seats := 2;
  end if;

  if v_outing.approved_count + v_seats > v_outing.seeking_count then
    raise exception 'Yeterli kontenjan kalmadı';
  end if;

  insert into public.date_join_requests (
    outing_id, requester_id, companion_user_id, message, seats_requested
  )
  values (
    p_outing_id,
    v_me,
    p_companion_user_id,
    nullif(trim(coalesce(p_message, '')), ''),
    v_seats
  )
  returning id into v_request_id;

  select creator_id into v_creator_id from public.date_outings where id = p_outing_id;

  perform public.notify_profile_user(
    v_creator_id,
    'date_join_request_received',
    'Yeni katılım isteği',
    left(coalesce(nullif(trim(p_message), ''), 'Date''inize katılmak istiyorlar'), 120),
    jsonb_build_object(
      'kind', 'date_join_request_received',
      'outing_id', p_outing_id,
      'request_id', v_request_id,
      'actor_id', v_me,
      'deep_link', '/date-center/' || p_outing_id::text,
      'action_hint', 'İsteği gör'
    )
  );

  return v_request_id;
end;
$$;

-- ─── RPC: isteğe yanıt ───────────────────────────────────────────────────────

create or replace function public.date_respond_join_request(
  p_request_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_req public.date_join_requests;
  v_outing public.date_outings;
  v_conversation_id uuid;
begin
  select * into v_req
  from public.date_join_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'İstek bulunamadı'; end if;
  if v_req.status <> 'pending' then raise exception 'İstek zaten yanıtlanmış'; end if;

  select * into v_outing from public.date_outings where id = v_req.outing_id for update;
  if v_outing.creator_id <> v_me then
    raise exception 'Yalnızca date oluşturucusu yanıtlayabilir';
  end if;

  if not p_approve then
    update public.date_join_requests
    set status = 'declined', responded_at = now()
    where id = p_request_id;

    perform public.notify_profile_user(
      v_req.requester_id,
      'date_join_request_declined',
      'Katılım isteği reddedildi',
      left(v_outing.title, 120),
      jsonb_build_object(
        'kind', 'date_join_request_declined',
        'outing_id', v_outing.id,
        'request_id', p_request_id,
        'deep_link', '/date-center/' || v_outing.id::text
      )
    );
    return;
  end if;

  if v_outing.status <> 'open' then
    raise exception 'Bu date artık istek kabul etmiyor';
  end if;

  if v_outing.approved_count + v_req.seats_requested > v_outing.seeking_count then
    raise exception 'Yeterli kontenjan kalmadı';
  end if;

  update public.date_join_requests
  set status = 'approved', responded_at = now()
  where id = p_request_id;

  insert into public.date_approved_members (outing_id, user_id, join_request_id)
  values (v_outing.id, v_req.requester_id, p_request_id)
  on conflict do nothing;

  if v_req.companion_user_id is not null then
    insert into public.date_approved_members (outing_id, user_id, join_request_id)
    values (v_outing.id, v_req.companion_user_id, p_request_id)
    on conflict do nothing;
  end if;

  update public.date_outings
  set approved_count = approved_count + v_req.seats_requested, updated_at = now()
  where id = v_outing.id;

  perform public.date_sync_outing_status(v_outing.id);

  v_conversation_id := public.ensure_date_outing_conversation(v_outing.id);

  perform public.notify_profile_user(
    v_req.requester_id,
    'date_join_request_approved',
    'Katılım isteğin onaylandı',
    left(v_outing.title, 120),
    jsonb_build_object(
      'kind', 'date_join_request_approved',
      'outing_id', v_outing.id,
      'request_id', p_request_id,
      'conversation_id', v_conversation_id,
      'deep_link', '/chat/' || v_conversation_id::text,
      'action_hint', 'Sohbete git'
    )
  );

  if v_req.companion_user_id is not null then
    perform public.notify_profile_user(
      v_req.companion_user_id,
      'date_join_request_approved',
      'Date katılımın onaylandı',
      left(v_outing.title, 120),
      jsonb_build_object(
        'kind', 'date_join_request_approved',
        'outing_id', v_outing.id,
        'conversation_id', v_conversation_id,
        'deep_link', '/chat/' || v_conversation_id::text
      )
    );
  end if;

  if (select status from public.date_outings where id = v_outing.id) = 'full' then
    perform public.notify_profile_user(
      v_outing.creator_id,
      'date_outing_full',
      'Date kontenjanı doldu',
      left(v_outing.title, 120),
      jsonb_build_object(
        'kind', 'date_outing_full',
        'outing_id', v_outing.id,
        'deep_link', '/date-center/' || v_outing.id::text
      )
    );
  end if;
end;
$$;

create or replace function public.date_withdraw_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  update public.date_join_requests
  set status = 'withdrawn', responded_at = now()
  where id = p_request_id
    and requester_id = v_me
    and status = 'pending';

  if not found then
    raise exception 'Geri çekilecek bekleyen istek bulunamadı';
  end if;
end;
$$;

create or replace function public.date_cancel_outing(p_outing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_outing public.date_outings;
  v_member_id uuid;
begin
  select * into v_outing from public.date_outings where id = p_outing_id for update;
  if not found then raise exception 'Date bulunamadı'; end if;
  if v_outing.creator_id <> v_me then raise exception 'Yetkisiz'; end if;
  if v_outing.status = 'cancelled' then return; end if;

  update public.date_outings
  set status = 'cancelled', updated_at = now()
  where id = p_outing_id;

  update public.date_join_requests
  set status = 'declined', responded_at = now()
  where outing_id = p_outing_id and status = 'pending';

  for v_member_id in
    select user_id from public.date_approved_members where outing_id = p_outing_id
  loop
    perform public.notify_profile_user(
      v_member_id,
      'date_outing_cancelled',
      'Date iptal edildi',
      left(v_outing.title, 120),
      jsonb_build_object(
        'kind', 'date_outing_cancelled',
        'outing_id', p_outing_id,
        'deep_link', '/date-center'
      )
    );
  end loop;
end;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.date_outings enable row level security;
alter table public.date_organizers enable row level security;
alter table public.date_join_requests enable row level security;
alter table public.date_approved_members enable row level security;
alter table public.date_outing_conversations enable row level security;

create policy date_outings_read on public.date_outings
  for select to authenticated
  using (public.date_has_access(auth.uid()));

create policy date_organizers_read on public.date_organizers
  for select to authenticated
  using (public.date_has_access(auth.uid()));

create policy date_join_requests_read on public.date_join_requests
  for select to authenticated
  using (
    public.date_has_access(auth.uid())
    and (
      requester_id = auth.uid()
      or companion_user_id = auth.uid()
      or exists (
        select 1 from public.date_outings o
        where o.id = outing_id and o.creator_id = auth.uid()
      )
    )
  );

create policy date_approved_members_read on public.date_approved_members
  for select to authenticated
  using (public.date_has_access(auth.uid()));

create policy date_outing_conv_read on public.date_outing_conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.date_organizers dg
      where dg.outing_id = outing_id and dg.user_id = auth.uid()
    )
    or exists (
      select 1 from public.date_approved_members dm
      where dm.outing_id = outing_id and dm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.date_outings o
      where o.id = outing_id and o.creator_id = auth.uid()
    )
  );

grant execute on function public.date_has_access(uuid) to authenticated;
grant execute on function public.date_create_outing(text, text, text, text, integer, integer, public.date_sought_gender, text, timestamptz, text, text, uuid[]) to authenticated;
grant execute on function public.date_send_join_request(uuid, text, uuid) to authenticated;
grant execute on function public.date_respond_join_request(uuid, boolean) to authenticated;
grant execute on function public.date_withdraw_join_request(uuid) to authenticated;
grant execute on function public.date_cancel_outing(uuid) to authenticated;
grant execute on function public.ensure_date_outing_conversation(uuid) to authenticated;
