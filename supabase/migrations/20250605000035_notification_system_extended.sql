-- BÖLÜM 12 — Bildirim Sistemi genişletmesi: kategori, öncelik, analitik, işletme ve arama bildirimleri

create type public.notification_category as enum (
  'social',
  'messages',
  'jobs',
  'businesses',
  'emergency',
  'system'
);

create type public.notification_priority as enum (
  'low',
  'normal',
  'high',
  'critical'
);

insert into public.notification_sound_settings (event_type, label) values
  ('regional_alert', 'Bölgesel Uyarı'),
  ('share', 'Paylaşım'),
  ('group_message', 'Grup Mesajı'),
  ('call_video', 'Görüntülü Arama'),
  ('call_missed', 'Kaçırılan Arama'),
  ('business_post', 'İşletme Paylaşımı'),
  ('business_campaign', 'Yeni Kampanya'),
  ('business_event', 'İşletme Etkinliği'),
  ('system', 'Sistem Duyurusu')
on conflict (event_type) do nothing;

-- Kritik/yüksek olaylarda bölgesel bildirim (regional_alert enum 34'te eklendi)
create or replace function public.notify_regional_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.severity in ('high', 'critical') and new.status = 'open' then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      ras.user_id,
      'regional_alert'::public.notification_event_type,
      'Bölgenizde yeni olay',
      left(new.title, 180),
      jsonb_build_object('incident_id', new.id, 'severity', new.severity, 'region_id', new.region_id),
      new.reporter_id
    from public.regional_alert_subscriptions ras
    join public.profiles p on p.id = ras.user_id
    where ras.region_id = new.region_id
      and ras.notify_incidents = true
      and p.id <> new.reporter_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'nearby_events')::boolean, true) = true;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    select
      ras.user_id,
      'regional_alert'::public.notification_event_type,
      'Bölgenizde yeni olay',
      left(new.title, 180),
      jsonb_build_object('incident_id', new.id, 'severity', new.severity, 'region_id', new.region_id),
      new.reporter_id
    from public.regional_alert_subscriptions ras
    join public.profiles p on p.id = ras.user_id
    where ras.region_id = new.region_id
      and ras.notify_incidents = true
      and p.id <> new.reporter_id
      and p.account_status = 'active'
      and coalesce((p.notification_prefs->>'nearby_events')::boolean, true) = true;
  end if;
  return new;
end;
$$;

drop trigger if exists incident_regional_notify on public.incident_reports;
create trigger incident_regional_notify
  after insert on public.incident_reports
  for each row execute function public.notify_regional_incident();

-- Bildirim meta alanları
alter table public.notifications
  add column if not exists category public.notification_category,
  add column if not exists priority public.notification_priority default 'normal',
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz;

create index if not exists notifications_user_category_idx
  on public.notifications (user_id, category, created_at desc);

create index if not exists notifications_priority_idx
  on public.notifications (priority, created_at desc);

-- Bölgesel abonelik: ilçe ve mahalle
alter table public.regional_alert_subscriptions
  add column if not exists districts text[] not null default '{}',
  add column if not exists neighborhoods text[] not null default '{}';

-- Bildirim teslimat analitiği
create table public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete set null,
  outbox_id uuid references public.notification_outbox (id) on delete set null,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.notification_event_type not null,
  category public.notification_category,
  priority public.notification_priority,
  delivered_at timestamptz not null default now(),
  opened_at timestamptz,
  clicked_at timestamptz
);

create index notification_delivery_log_event_idx
  on public.notification_delivery_log (event_type, delivered_at desc);

create index notification_delivery_log_recipient_idx
  on public.notification_delivery_log (recipient_id, delivered_at desc);

-- Kategori ve öncelik belirleme
create or replace function public.notification_category_for(p_event_type public.notification_event_type)
returns public.notification_category
language sql
immutable
as $$
  select case p_event_type
    when 'like' then 'social'::public.notification_category
    when 'comment' then 'social'::public.notification_category
    when 'comment_reply' then 'social'::public.notification_category
    when 'quote' then 'social'::public.notification_category
    when 'follow' then 'social'::public.notification_category
    when 'friend_request' then 'social'::public.notification_category
    when 'friend_accepted' then 'social'::public.notification_category
    when 'mention' then 'social'::public.notification_category
    when 'reel_like' then 'social'::public.notification_category
    when 'save' then 'social'::public.notification_category
    when 'share' then 'social'::public.notification_category
    when 'message' then 'messages'::public.notification_category
    when 'group_message' then 'messages'::public.notification_category
    when 'call_incoming' then 'messages'::public.notification_category
    when 'call_video' then 'messages'::public.notification_category
    when 'call_missed' then 'messages'::public.notification_category
    when 'job' then 'jobs'::public.notification_category
    when 'business_post' then 'businesses'::public.notification_category
    when 'business_campaign' then 'businesses'::public.notification_category
    when 'business_event' then 'businesses'::public.notification_category
    when 'event_nearby' then 'businesses'::public.notification_category
    when 'emergency' then 'emergency'::public.notification_category
    when 'regional_alert' then 'emergency'::public.notification_category
    when 'incident_update' then 'emergency'::public.notification_category
    when 'security_alert' then 'emergency'::public.notification_category
    else 'system'::public.notification_category
  end;
$$;

create or replace function public.notification_priority_for(
  p_event_type public.notification_event_type,
  p_data jsonb default '{}'
)
returns public.notification_priority
language sql
immutable
as $$
  select case
    when p_event_type in ('emergency', 'security_alert')
      or (p_data->>'severity') = 'critical'
      or (p_data->>'emergency_type') in ('fire', 'flood', 'landslide') then 'critical'::public.notification_priority
    when p_event_type in ('call_incoming', 'call_video', 'call_missed', 'regional_alert', 'incident_update')
      or (p_data->>'severity') = 'high' then 'high'::public.notification_priority
    when p_event_type in ('save', 'trust_score_change', 'achievement_earned', 'badge_earned') then 'low'::public.notification_priority
    else 'normal'::public.notification_priority
  end;
$$;

create or replace function public.set_notification_metadata()
returns trigger
language plpgsql
as $$
begin
  if new.category is null then
    new.category := public.notification_category_for(new.event_type);
  end if;
  if new.priority is null then
    new.priority := public.notification_priority_for(new.event_type, new.data);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_set_metadata on public.notifications;
create trigger notifications_set_metadata
  before insert on public.notifications
  for each row execute function public.set_notification_metadata();

-- Mevcut kayıtları güncelle
update public.notifications
set
  category = public.notification_category_for(event_type),
  priority = public.notification_priority_for(event_type, data)
where category is null;

alter table public.notifications
  alter column category set default 'system',
  alter column category set not null;

-- Bölge eşleşme yardımcısı
create or replace function public.regional_subscription_matches(
  p_subscription public.regional_alert_subscriptions,
  p_profile public.profiles,
  p_district text default null,
  p_neighborhood text default null
)
returns boolean
language sql
immutable
as $$
  select
    p_subscription.region_id = p_profile.region_id
    and (
      cardinality(p_subscription.districts) = 0
      or p_profile.district = any(p_subscription.districts)
      or (p_district is not null and p_district = any(p_subscription.districts))
    )
    and (
      cardinality(p_subscription.neighborhoods) = 0
      or p_neighborhood is null
      or p_neighborhood = any(p_subscription.neighborhoods)
    );
$$;

-- Akıllı bildirim: ilgi alanı eşleşince öncelik yükselt
create or replace function public.smart_priority_boost(
  p_base public.notification_priority,
  p_interests text[],
  p_content_tag text
)
returns public.notification_priority
language sql
immutable
as $$
  select case
    when p_base = 'critical'::public.notification_priority then 'critical'::public.notification_priority
    when p_content_tag = any(p_interests) and p_base = 'normal'::public.notification_priority
      then 'high'::public.notification_priority
    else p_base
  end;
$$;

-- Mesaj bildirimi: grup mesajı ayrımı
create or replace function public.notify_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  preview text;
  v_event public.notification_event_type;
  v_conv_type public.conversation_type;
  v_conv_title text;
begin
  select coalesce(p.full_name, '@' || p.username)
  into sender_name
  from public.profiles p
  where p.id = new.sender_id;

  select c.type, c.title into v_conv_type, v_conv_title
  from public.conversations c
  where c.id = new.conversation_id;

  v_event := case when v_conv_type = 'group' then 'group_message' else 'message' end;

  preview := left(
    case new.message_type
      when 'image' then 'Fotoğraf gönderdi'
      when 'video' then 'Video gönderdi'
      when 'audio' then 'Ses kaydı gönderdi'
      when 'location' then 'Konum paylaştı'
      else new.content
    end,
    180
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview else preview end,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'is_group', v_conv_type = 'group'
    ),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    cm.user_id,
    v_event,
    case when v_conv_type = 'group' then coalesce(v_conv_title, 'Grup mesajı') else coalesce(sender_name, 'Yeni mesaj') end,
    case when v_conv_type = 'group' then coalesce(sender_name, 'Birisi') || ': ' || preview else preview end,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id', new.id,
      'is_group', v_conv_type = 'group'
    ),
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id;

  return new;
end;
$$;

-- Arama bildirimleri
create or replace function public.notify_call_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_name text;
  v_event public.notification_event_type;
  v_title text;
  v_body text;
begin
  select coalesce(p.full_name, '@' || p.username)
  into caller_name
  from public.profiles p
  where p.id = new.caller_id;

  if tg_op = 'INSERT' and new.status = 'ringing' then
    v_event := case when new.call_type = 'video' then 'call_video' else 'call_incoming' end;
    v_title := case when new.call_type = 'video' then 'Görüntülü arama' else 'Sesli arama' end;
    v_body := coalesce(caller_name, 'Birisi') || ' sizi arıyor';

    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      new.callee_id,
      v_event,
      v_title,
      v_body,
      jsonb_build_object('call_session_id', new.id, 'call_type', new.call_type),
      new.caller_id
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      new.callee_id,
      v_event,
      v_title,
      v_body,
      jsonb_build_object('call_session_id', new.id, 'call_type', new.call_type),
      new.caller_id
    );
  elsif tg_op = 'UPDATE' and new.status = 'missed' and old.status <> 'missed' then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (
      new.callee_id,
      'call_missed'::public.notification_event_type,
      'Kaçırılan arama',
      coalesce(caller_name, 'Birisi') || ' adlı kişiden kaçırılan arama',
      jsonb_build_object('call_session_id', new.id, 'call_type', new.call_type),
      new.caller_id
    );

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      new.callee_id,
      'call_missed'::public.notification_event_type,
      'Kaçırılan arama',
      coalesce(caller_name, 'Birisi') || ' adlı kişiden kaçırılan arama',
      jsonb_build_object('call_session_id', new.id, 'call_type', new.call_type),
      new.caller_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists call_session_notify on public.call_sessions;
create trigger call_session_notify
  after insert or update of status on public.call_sessions
  for each row execute function public.notify_call_session();

-- İşletme takipçilerine yeni kampanya
create or replace function public.notify_business_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_name text;
  v_owner_id uuid;
begin
  select b.name, b.owner_id into v_business_name, v_owner_id
  from public.businesses b
  where b.id = new.business_id;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    bf.user_id,
    'business_campaign'::public.notification_event_type,
    coalesce(v_business_name, 'Takip ettiğiniz işletme'),
    left(new.title, 180),
    jsonb_build_object('campaign_id', new.id, 'business_id', new.business_id),
    v_owner_id
  from public.business_follows bf
  join public.profiles p on p.id = bf.user_id
  where bf.business_id = new.business_id
    and bf.user_id <> v_owner_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'businesses')::boolean, true) = true;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    bf.user_id,
    'business_campaign'::public.notification_event_type,
    coalesce(v_business_name, 'Takip ettiğiniz işletme'),
    left(new.title, 180),
    jsonb_build_object('campaign_id', new.id, 'business_id', new.business_id),
    v_owner_id
  from public.business_follows bf
  join public.profiles p on p.id = bf.user_id
  where bf.business_id = new.business_id
    and bf.user_id <> v_owner_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'businesses')::boolean, true) = true;

  return new;
end;
$$;

drop trigger if exists business_campaign_notify on public.business_campaigns;
create trigger business_campaign_notify
  after insert on public.business_campaigns
  for each row execute function public.notify_business_campaign();

-- İşletme takipçilerine yeni gönderi (işletme sahibi paylaşımı)
create or replace function public.notify_business_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    bf.user_id,
    'business_post'::public.notification_event_type,
    coalesce(b.name, 'Takip ettiğiniz işletme'),
    left(coalesce(new.title, new.content), 180),
    jsonb_build_object('post_id', new.id, 'business_id', b.id),
    new.author_id
  from public.business_follows bf
  join public.businesses b on b.id = bf.business_id
  join public.profiles p on p.id = bf.user_id
  where b.owner_id = new.author_id
    and bf.user_id <> new.author_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'businesses')::boolean, true) = true;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    bf.user_id,
    'business_post'::public.notification_event_type,
    coalesce(b.name, 'Takip ettiğiniz işletme'),
    left(coalesce(new.title, new.content), 180),
    jsonb_build_object('post_id', new.id, 'business_id', b.id),
    new.author_id
  from public.business_follows bf
  join public.businesses b on b.id = bf.business_id
  join public.profiles p on p.id = bf.user_id
  where b.owner_id = new.author_id
    and bf.user_id <> new.author_id
    and p.account_status = 'active'
    and coalesce((p.notification_prefs->>'businesses')::boolean, true) = true;

  return new;
end;
$$;

drop trigger if exists business_post_notify on public.posts;
create trigger business_post_notify
  after insert on public.posts
  for each row execute function public.notify_business_post();

-- İş ilanı bildirimine outbox ekle (takipçiler)
create or replace function public.notify_new_job_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and new.business_id is not null then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    select
      bf.user_id,
      'job'::public.notification_event_type,
      'Takip ettiğiniz işletmeden yeni ilan',
      left(new.title, 120),
      jsonb_build_object('job_id', new.id, 'subtype', 'followed_business_listing'),
      new.author_id
    from public.business_follows bf
    join public.profiles p on p.id = bf.user_id
    where bf.business_id = new.business_id
      and bf.notify_on_new_listing = true
      and bf.user_id <> new.author_id
      and coalesce((p.notification_prefs->>'jobs')::boolean, true) = true;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    select
      bf.user_id,
      'job'::public.notification_event_type,
      'Takip ettiğiniz işletmeden yeni ilan',
      left(new.title, 120),
      jsonb_build_object('job_id', new.id, 'subtype', 'followed_business_listing'),
      new.author_id
    from public.business_follows bf
    join public.profiles p on p.id = bf.user_id
    where bf.business_id = new.business_id
      and bf.notify_on_new_listing = true
      and bf.user_id <> new.author_id
      and coalesce((p.notification_prefs->>'jobs')::boolean, true) = true;
  end if;
  return new;
end;
$$;

-- Sistem duyurusu
create or replace function public.admin_send_broadcast(
  p_type public.broadcast_type,
  p_title text,
  p_body text,
  p_region_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_event public.notification_event_type;
  v_recipient record;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_event := case p_type
    when 'emergency' then 'emergency'::public.notification_event_type
    else 'system'::public.notification_event_type
  end;

  for v_recipient in
    select p.id from public.profiles p
    where p.account_status = 'active'
      and (p_region_id is null or p.region_id = p_region_id)
  loop
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, jsonb_build_object('broadcast', true, 'broadcast_type', p_type), auth.uid());
    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (v_recipient.id, v_event, p_title, p_body, jsonb_build_object('broadcast', true, 'broadcast_type', p_type), auth.uid());
    v_count := v_count + 1;
  end loop;

  insert into public.admin_broadcasts (sent_by, broadcast_type, title, body, region_id, recipient_count)
  values (auth.uid(), p_type, p_title, p_body, p_region_id, v_count);

  return v_count;
end;
$$;

-- Admin bildirim istatistikleri
create or replace function public.admin_notification_stats(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select jsonb_build_object(
    'sent_count', (
      select count(*)::int from public.notification_delivery_log
      where delivered_at >= now() - (p_days || ' days')::interval
    ),
    'opened_count', (
      select count(*)::int from public.notification_delivery_log
      where opened_at is not null
        and delivered_at >= now() - (p_days || ' days')::interval
    ),
    'clicked_count', (
      select count(*)::int from public.notification_delivery_log
      where clicked_at is not null
        and delivered_at >= now() - (p_days || ' days')::interval
    ),
    'open_rate', (
      select case when count(*) = 0 then 0
        else round(count(*) filter (where opened_at is not null)::numeric / count(*)::numeric * 100, 1)
      end
      from public.notification_delivery_log
      where delivered_at >= now() - (p_days || ' days')::interval
    ),
    'click_rate', (
      select case when count(*) = 0 then 0
        else round(count(*) filter (where clicked_at is not null)::numeric / count(*)::numeric * 100, 1)
      end
      from public.notification_delivery_log
      where delivered_at >= now() - (p_days || ' days')::interval
    ),
    'by_category', (
      select coalesce(jsonb_object_agg(category, cnt), '{}'::jsonb)
      from (
        select category::text, count(*)::int as cnt
        from public.notifications
        where created_at >= now() - (p_days || ' days')::interval
        group by category
      ) sub
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Teslimat kaydı (outbox işlendiğinde)
create or replace function public.log_notification_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.processed_at is not null and old.processed_at is null then
    insert into public.notification_delivery_log (
      outbox_id, recipient_id, event_type, category, priority, delivered_at
    )
    values (
      new.id,
      new.recipient_id,
      new.event_type,
      public.notification_category_for(new.event_type),
      public.notification_priority_for(new.event_type, new.data),
      new.processed_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notification_outbox_delivery_log on public.notification_outbox;
create trigger notification_outbox_delivery_log
  after update of processed_at on public.notification_outbox
  for each row execute function public.log_notification_delivery();

-- RLS
alter table public.notification_delivery_log enable row level security;

create policy "notification_delivery_log_admin_read" on public.notification_delivery_log
  for select using (public.is_admin());
