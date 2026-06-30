-- BÖLÜM 13 — Etkinlik Merkezi ve Organizasyon Sistemi

alter type public.notification_event_type add value if not exists 'event_reminder';

-- Etkinlik kategorileri
create type public.event_category as enum (
  'concert',
  'festival',
  'sports',
  'tournament',
  'meeting',
  'seminar',
  'education',
  'wedding_venue',
  'business',
  'municipality',
  'university',
  'social_responsibility'
);

create type public.event_map_category as enum (
  'entertainment',
  'sports',
  'education',
  'municipality',
  'business'
);

create type public.event_rsvp_status as enum (
  'going',
  'maybe',
  'not_going'
);

create type public.event_ticket_type as enum (
  'free',
  'paid'
);

-- Etkinlik tablosu genişletmeleri
alter table public.events
  add column if not exists business_id uuid references public.businesses (id) on delete set null,
  add column if not exists category public.event_category not null default 'meeting',
  add column if not exists map_category public.event_map_category not null default 'entertainment',
  add column if not exists max_attendees integer,
  add column if not exists view_count integer not null default 0,
  add column if not exists map_view_count integer not null default 0,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists ticket_type public.event_ticket_type not null default 'free',
  add column if not exists qr_token text unique,
  add column if not exists conversation_id uuid references public.conversations (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists events_business_idx on public.events (business_id) where business_id is not null;
create index if not exists events_featured_starts_idx on public.events (is_featured, starts_at) where status = 'published';
create index if not exists events_map_category_idx on public.events (map_category, starts_at);

-- Katılım (RSVP)
create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.event_rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_rsvps_user_idx on public.event_rsvps (user_id, updated_at desc);
create index event_rsvps_event_going_idx on public.event_rsvps (event_id) where status = 'going';

-- Organizatör güncellemeleri / duyurular
create table public.event_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index event_updates_event_idx on public.event_updates (event_id, created_at desc);

-- QR giriş kayıtları
create table public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_checkins_event_idx on public.event_checkins (event_id, checked_in_at desc);

-- Zamanlanmış etkinlik hatırlatmaları (edge/cron işler)
create table public.event_reminder_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('24h', '1h', 'start')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, reminder_kind)
);

create index event_reminder_queue_pending_idx
  on public.event_reminder_queue (scheduled_at)
  where sent_at is null;

-- Harita kategorisi otomatik eşleme
create or replace function public.event_map_category_for(p_category public.event_category)
returns public.event_map_category
language sql
immutable
as $$
  select case p_category
    when 'concert' then 'entertainment'::public.event_map_category
    when 'festival' then 'entertainment'::public.event_map_category
    when 'wedding_venue' then 'entertainment'::public.event_map_category
    when 'sports' then 'sports'::public.event_map_category
    when 'tournament' then 'sports'::public.event_map_category
    when 'seminar' then 'education'::public.event_map_category
    when 'education' then 'education'::public.event_map_category
    when 'meeting' then 'education'::public.event_map_category
    when 'university' then 'education'::public.event_map_category
    when 'municipality' then 'municipality'::public.event_map_category
    when 'social_responsibility' then 'municipality'::public.event_map_category
    else 'business'::public.event_map_category
  end;
$$;

create or replace function public.events_before_write()
returns trigger
language plpgsql
as $$
begin
  new.map_category := public.event_map_category_for(new.category);
  new.updated_at := now();
  if new.qr_token is null then
    new.qr_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists events_before_write on public.events;
create trigger events_before_write
  before insert or update on public.events
  for each row execute function public.events_before_write();

-- Etkinlik sohbeti oluştur
create or replace function public.create_event_conversation(p_event_id uuid, p_organizer_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  insert into public.conversations (type, title, created_by)
  values ('group', left(p_title, 80), p_organizer_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, p_organizer_id, 'founder');

  update public.events
  set conversation_id = v_conversation_id
  where id = p_event_id;

  return v_conversation_id;
end;
$$;

create or replace function public.on_event_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and new.conversation_id is null then
    perform public.create_event_conversation(new.id, new.organizer_id, new.title);
  end if;
  return new;
end;
$$;

drop trigger if exists event_created_setup on public.events;
create trigger event_created_setup
  after insert on public.events
  for each row execute function public.on_event_created();

-- Konum güncelleme
create or replace function public.set_event_location(p_event_id uuid, lng double precision, lat double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography
  where id = p_event_id and organizer_id = auth.uid();
end;
$$;

-- Görüntülenme sayacı
create or replace function public.increment_event_view(p_event_id uuid, p_source text default 'detail')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source = 'map' then
    update public.events set map_view_count = map_view_count + 1 where id = p_event_id;
  else
    update public.events set view_count = view_count + 1 where id = p_event_id;
  end if;
end;
$$;

-- RSVP sonrası sohbete ekle + başarımlar
create or replace function public.on_event_rsvp_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_going_count int;
  v_user_going_count int;
begin
  select conversation_id into v_conversation_id from public.events where id = new.event_id;

  if new.status in ('going', 'maybe') and v_conversation_id is not null then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, new.user_id, 'member')
    on conflict do nothing;
  end if;

  if new.status = 'going' then
    perform public.award_achievement(new.user_id, 'first_event_rsvp');

    select count(*) into v_user_going_count
    from public.event_rsvps
    where user_id = new.user_id and status = 'going';

    if v_user_going_count >= 10 then
      perform public.award_achievement(new.user_id, 'events_10_rsvp');
    end if;

    insert into public.event_reminder_queue (event_id, user_id, reminder_kind, scheduled_at)
    select
      e.id,
      new.user_id,
      r.kind,
      e.starts_at - r.reminder_offset
    from public.events e
    cross join (
      values
        ('24h'::text, interval '24 hours'),
        ('1h'::text, interval '1 hour'),
        ('start'::text, interval '0')
    ) as r(kind, reminder_offset)
    where e.id = new.event_id
      and e.starts_at - r.reminder_offset > now()
    on conflict do nothing;
  end if;

  if tg_op = 'DELETE' or new.status = 'not_going' then
    delete from public.event_reminder_queue
    where event_id = coalesce(new.event_id, old.event_id)
      and user_id = coalesce(new.user_id, old.user_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists event_rsvp_changed on public.event_rsvps;
create trigger event_rsvp_changed
  after insert or update or delete on public.event_rsvps
  for each row execute function public.on_event_rsvp_changed();

-- Organizatör başarımları
create or replace function public.on_event_organizer_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_going_count int;
begin
  if new.status = 'published' then
    perform public.award_achievement(new.organizer_id, 'first_event_created');

    select count(*) into v_going_count
    from public.event_rsvps
    where event_id = new.id and status = 'going';

    if v_going_count >= 50 then
      perform public.award_achievement(new.organizer_id, 'event_community_leader');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists event_organizer_achievement on public.events;
create trigger event_organizer_achievement
  after insert or update of status on public.events
  for each row execute function public.on_event_organizer_achievement();

-- İşletme takipçilerine etkinlik bildirimi
create or replace function public.notify_business_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'published' or new.business_id is null then
    return new;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    bf.user_id,
    'business_event'::public.notification_event_type,
    coalesce(b.name, 'Takip ettiğiniz işletme'),
    left(new.title, 180),
    jsonb_build_object('event_id', new.id, 'business_id', b.id),
    new.organizer_id
  from public.business_follows bf
  join public.businesses b on b.id = bf.business_id
  join public.profiles p on p.id = bf.user_id
  where b.id = new.business_id
    and bf.user_id <> new.organizer_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'businesses')::boolean, true) = true;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    bf.user_id,
    'business_event'::public.notification_event_type,
    coalesce(b.name, 'Takip ettiğiniz işletme'),
    left(new.title, 180),
    jsonb_build_object('event_id', new.id, 'business_id', b.id),
    new.organizer_id
  from public.business_follows bf
  join public.businesses b on b.id = bf.business_id
  join public.profiles p on p.id = bf.user_id
  where b.id = new.business_id
    and bf.user_id <> new.organizer_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'businesses')::boolean, true) = true;

  return new;
end;
$$;

drop trigger if exists business_event_notify on public.events;
create trigger business_event_notify
  after insert or update of status on public.events
  for each row
  when (new.status = 'published' and new.business_id is not null)
  execute function public.notify_business_event();

-- Hatırlatma kuyruğu işleyici (cron / edge function)
create or replace function public.process_event_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
  v_title text;
begin
  for v_row in
    select q.id, q.event_id, q.user_id, q.reminder_kind, e.title, e.starts_at
    from public.event_reminder_queue q
    join public.events e on e.id = q.event_id
    where q.sent_at is null
      and q.scheduled_at <= now()
      and e.status = 'published'
      and e.starts_at > now() - interval '5 minutes'
  loop
    v_title := case v_row.reminder_kind
      when '24h' then 'Etkinlik yarın'
      when '1h' then 'Etkinlik 1 saat sonra'
      else 'Etkinlik başlıyor'
    end;

    insert into public.notification_outbox (recipient_id, event_type, title, body, data)
    values (
      v_row.user_id,
      'event_reminder'::public.notification_event_type,
      v_title,
      left(v_row.title, 180),
      jsonb_build_object('event_id', v_row.event_id, 'reminder_kind', v_row.reminder_kind)
    );

    insert into public.notifications (user_id, event_type, title, body, data)
    values (
      v_row.user_id,
      'event_reminder'::public.notification_event_type,
      v_title,
      left(v_row.title, 180),
      jsonb_build_object('event_id', v_row.event_id, 'reminder_kind', v_row.reminder_kind)
    );

    update public.event_reminder_queue set sent_at = now() where id = v_row.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- QR giriş
create or replace function public.check_in_event(p_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select id into v_event_id from public.events where qr_token = p_qr_token and status = 'published';
  if v_event_id is null then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz QR kod');
  end if;

  if not exists (
    select 1 from public.event_rsvps
    where event_id = v_event_id and user_id = auth.uid() and status = 'going'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Bu etkinliğe katılım kaydınız yok');
  end if;

  insert into public.event_checkins (event_id, user_id)
  values (v_event_id, auth.uid())
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'event_id', v_event_id);
end;
$$;

-- Raporlama hedefi
create or replace function public.resolve_report_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  case p_target_type
    when 'profile' then return p_target_id;
    when 'post' then
      select author_id into v_user_id from public.posts where id = p_target_id;
      return v_user_id;
    when 'comment' then
      select author_id into v_user_id from public.post_comments where id = p_target_id;
      return v_user_id;
    when 'event' then
      select organizer_id into v_user_id from public.events where id = p_target_id;
      return v_user_id;
    else return null;
  end case;
end;
$$;

-- RLS
alter table public.event_rsvps enable row level security;
alter table public.event_updates enable row level security;
alter table public.event_checkins enable row level security;
alter table public.event_reminder_queue enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select using (status = 'published' or organizer_id = auth.uid());

create policy "events_organizer_insert" on public.events
  for insert with check (auth.uid() = organizer_id);

create policy "events_organizer_update" on public.events
  for update using (auth.uid() = organizer_id);

create policy "event_rsvps_public_read" on public.event_rsvps
  for select using (true);

create policy "event_rsvps_self_write" on public.event_rsvps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "event_updates_public_read" on public.event_updates
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_updates.event_id
        and (e.status = 'published' or e.organizer_id = auth.uid())
    )
  );

create policy "event_updates_organizer_insert" on public.event_updates
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.events e
      where e.id = event_updates.event_id and e.organizer_id = auth.uid()
    )
  );

create policy "event_checkins_organizer_read" on public.event_checkins
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.events e
      where e.id = event_checkins.event_id and e.organizer_id = auth.uid()
    )
  );

create policy "event_checkins_self_insert" on public.event_checkins
  for insert with check (auth.uid() = user_id);

create policy "event_reminder_queue_self_read" on public.event_reminder_queue
  for select using (auth.uid() = user_id);

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger event_rsvps_updated_at
  before update on public.event_rsvps
  for each row execute function public.set_updated_at();
