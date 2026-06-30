-- BÖLÜM 12 — Bildirim Sistemi: sessiz saatler, bölgesel uyarılar, outbox işleme

-- Sessiz saatler (acil durum ve güvenlik uyarıları hariç)
alter table public.profiles
  add column if not exists quiet_hours jsonb not null default '{
    "enabled": false,
    "start": "22:00",
    "end": "08:00",
    "timezone": "Europe/Istanbul"
  }'::jsonb;

-- Bölgesel bildirim aboneliği
create table public.regional_alert_subscriptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  region_id text not null references public.regions (id),
  notify_emergency boolean not null default true,
  notify_incidents boolean not null default true,
  notify_events boolean not null default true,
  notify_jobs boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, region_id)
);

create index regional_alert_subscriptions_region_idx
  on public.regional_alert_subscriptions (region_id);

-- Kullanıcı bölgesi değişince otomatik abonelik
create or replace function public.sync_regional_alert_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.region_id is not null then
    insert into public.regional_alert_subscriptions (user_id, region_id)
    values (new.id, new.region_id)
    on conflict (user_id, region_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_regional_subscription on public.profiles;
create trigger profile_regional_subscription
  after insert or update of region_id on public.profiles
  for each row execute function public.sync_regional_alert_subscription();

-- Mevcut kullanıcılar için backfill
insert into public.regional_alert_subscriptions (user_id, region_id)
select p.id, p.region_id
from public.profiles p
where p.region_id is not null
on conflict (user_id, region_id) do nothing;

-- Yakındaki etkinlik bildirimi (yeni yayınlanan etkinlik)
create or replace function public.notify_regional_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      ras.user_id,
      'event_nearby'::public.notification_event_type,
      'Yakınınızda yeni etkinlik',
      left(new.title, 180),
      jsonb_build_object('event_id', new.id, 'region_id', new.region_id),
      new.organizer_id
    from public.regional_alert_subscriptions ras
    join public.profiles p on p.id = ras.user_id
    where ras.region_id = new.region_id
      and ras.notify_events = true
      and p.id <> new.organizer_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'nearby_events')::boolean, true) = true;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    select
      ras.user_id,
      'event_nearby'::public.notification_event_type,
      'Yakınınızda yeni etkinlik',
      left(new.title, 180),
      jsonb_build_object('event_id', new.id, 'region_id', new.region_id),
      new.organizer_id
    from public.regional_alert_subscriptions ras
    join public.profiles p on p.id = ras.user_id
    where ras.region_id = new.region_id
      and ras.notify_events = true
      and p.id <> new.organizer_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'nearby_events')::boolean, true) = true;
  end if;
  return new;
end;
$$;

drop trigger if exists event_regional_notify on public.events;
create trigger event_regional_notify
  after insert or update of status on public.events
  for each row
  when (new.status = 'published')
  execute function public.notify_regional_event();

-- Outbox kuyruğunu push edge function'a yönlendir
create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_outbox_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_url is null or v_key is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/process-notification-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('outbox_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists notification_outbox_dispatch on public.notification_outbox;
create trigger notification_outbox_dispatch
  after insert on public.notification_outbox
  for each row
  when (new.processed_at is null)
  execute function public.dispatch_outbox_push();

-- RLS
alter table public.regional_alert_subscriptions enable row level security;

create policy "regional_subscriptions_self_all" on public.regional_alert_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger regional_alert_subscriptions_updated_at
  before update on public.regional_alert_subscriptions
  for each row execute function public.set_updated_at();
