-- Bildirim sistemi tamamlama: arkadaşlık isteği, kanal inbox, hatırlatma cron

-- ─── Arkadaşlık isteği bildirimi ─────────────────────────────────────────────

create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select coalesce(p.full_name, '@' || p.username)
  into v_sender_name
  from public.profiles p
  where p.id = new.sender_id;

  insert into public.notifications (user_id, event_type, title, body, actor_id, data)
  values (
    new.receiver_id,
    'friend_request'::public.notification_event_type,
    'Arkadaşlık isteği',
    coalesce(v_sender_name, 'Birisi') || ' sana arkadaşlık isteği gönderdi',
    new.sender_id,
    jsonb_build_object('request_id', new.id, 'actor_id', new.sender_id)
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    new.receiver_id,
    'friend_request'::public.notification_event_type,
    'Arkadaşlık isteği',
    coalesce(v_sender_name, 'Birisi') || ' sana arkadaşlık isteği gönderdi',
    jsonb_build_object('request_id', new.id, 'actor_id', new.sender_id),
    new.sender_id
  );

  return new;
end;
$$;

drop trigger if exists friend_request_notify on public.friend_requests;
create trigger friend_request_notify
  after insert on public.friend_requests
  for each row
  execute function public.notify_friend_request();

-- ─── Kanal gönderisi → inbox + push ──────────────────────────────────────────

create or replace function public.notify_channel_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel public.channels%rowtype;
  v_body text;
begin
  select * into v_channel from public.channels where id = new.channel_id;

  if not v_channel.notify_subscribers then
    return new;
  end if;

  v_body := left(new.content, 180);

  insert into public.notifications (user_id, event_type, title, body, actor_id, data)
  select
    cs.user_id,
    'channel_post'::public.notification_event_type,
    v_channel.name,
    v_body,
    new.author_id,
    jsonb_build_object(
      'channel_id', new.channel_id,
      'post_id', new.id,
      'channel_type', v_channel.channel_type
    )
  from public.channel_subscribers cs
  join public.profiles p on p.id = cs.user_id
  where cs.channel_id = new.channel_id
    and cs.notify_enabled = true
    and cs.user_id <> new.author_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'channels')::boolean, true) = true;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cs.user_id,
    'channel_post'::public.notification_event_type,
    v_channel.name,
    v_body,
    jsonb_build_object(
      'channel_id', new.channel_id,
      'post_id', new.id,
      'channel_type', v_channel.channel_type
    ),
    new.author_id
  from public.channel_subscribers cs
  join public.profiles p on p.id = cs.user_id
  where cs.channel_id = new.channel_id
    and cs.notify_enabled = true
    and cs.user_id <> new.author_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'channels')::boolean, true) = true;

  return new;
end;
$$;

-- ─── Etkinlik hatırlatması cron (pg_cron varsa) ─────────────────────────────

do $cron$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule('process-event-reminders');
  perform cron.schedule(
    'process-event-reminders',
    '*/15 * * * *',
    $job$select public.process_event_reminders()$job$
  );
exception
  when others then
    raise notice 'pg_cron kullanılamıyor; event reminder manuel/edge ile çalıştırılmalı: %', sqlerrm;
end;
$cron$;
