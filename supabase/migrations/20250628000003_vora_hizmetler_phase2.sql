-- Vora Hizmetler — faz 2: akıllı push, sponsorlu listeleme, iş sohbeti, güvenli ödeme kaydı

alter type public.notification_event_type add value if not exists 'vora_service_request_published';
alter type public.notification_event_type add value if not exists 'vora_service_offer_received';
alter type public.notification_event_type add value if not exists 'vora_service_offer_accepted';
alter type public.notification_event_type add value if not exists 'vora_service_emergency_call';

insert into public.app_system_config (key, value)
values (
  'vora_hizmetler_push',
  jsonb_build_object(
    'enabled', true,
    'max_recipients', 150,
    'nearby_radius_km', 15
  )
)
on conflict (key) do nothing;

-- Sponsorlu / premium görünürlük
alter table public.vora_service_providers
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists sponsored_until timestamptz;

create index if not exists vora_service_providers_sponsored_idx
  on public.vora_service_providers (is_sponsored desc, is_premium desc, rating desc)
  where is_active = true;

-- İş kabulünde mesajlaşma bağlantısı (isteğe bağlı cache)
create table if not exists public.vora_service_conversations (
  request_id uuid primary key references public.vora_service_requests (id) on delete cascade,
  conversation_id uuid not null,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.vora_service_conversations enable row level security;

create policy vora_service_conversations_participants on public.vora_service_conversations
  for select using (requester_id = auth.uid() or provider_user_id = auth.uid());

create policy vora_service_conversations_insert on public.vora_service_conversations
  for insert with check (requester_id = auth.uid() or provider_user_id = auth.uid());

-- Ödeme kaydı (Vora Güvenli Ödeme — ileride Stripe entegrasyonu)
create type public.vora_service_payment_status as enum (
  'pending', 'authorized', 'completed', 'failed', 'refunded'
);

create table if not exists public.vora_service_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.vora_service_requests (id) on delete cascade,
  offer_id uuid references public.vora_service_offers (id) on delete set null,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  payee_provider_id uuid references public.vora_service_providers (id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'card', 'transfer', 'vora_secure')),
  status public.vora_service_payment_status not null default 'pending',
  external_ref text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vora_service_payments_request_idx on public.vora_service_payments (request_id);

alter table public.vora_service_payments enable row level security;

create policy vora_service_payments_select on public.vora_service_payments
  for select using (
    payer_id = auth.uid()
    or payee_provider_id in (select id from public.vora_service_providers where user_id = auth.uid())
  );

create policy vora_service_payments_insert on public.vora_service_payments
  for insert with check (payer_id = auth.uid());

create trigger vora_service_payments_updated_at
  before update on public.vora_service_payments
  for each row execute function public.set_updated_at();

-- Push yardımcıları
create or replace function public.is_vora_hizmetler_push_enabled()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value->>'enabled')::boolean from public.app_system_config where key = 'vora_hizmetler_push'),
    false
  );
$$;

create or replace function public.vora_service_category_label(p_category public.vora_service_category)
returns text language sql immutable as $$
  select case p_category
    when 'elektrik' then 'Elektrik'
    when 'su_tesisati' then 'Su Tesisatı'
    when 'boya' then 'Boya'
    when 'kombi' then 'Kombi'
    when 'klima' then 'Klima'
    when 'temizlik' then 'Temizlik'
    when 'oto_tamir' then 'Oto Tamir'
    when 'cekici' then 'Çekici'
    else initcap(replace(p_category::text, '_', ' '))
  end;
$$;

-- Talep yayınlandığında: yalnızca aynı bölge + kategori ustalarına bildirim
create or replace function public.notify_vora_service_request_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_city text;
  v_category_label text;
  v_push_title text;
  v_push_body text;
  v_max_recipients int;
  v_radius_m double precision;
  v_data jsonb;
begin
  if tg_op <> 'INSERT' then return new; end if;
  if new.status <> 'pending_offers' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  v_city := coalesce(new.city, (select name from public.regions where id = new.region_id limit 1), 'Bölgeniz');
  v_category_label := public.vora_service_category_label(new.category);

  v_push_title := case when new.is_emergency then 'Acil · ' else '' end
    || v_city || '''da ' || v_category_label || ' işi';

  v_push_body := left(new.title, 120);

  v_data := jsonb_build_object(
    'service_request_id', new.id,
    'request_id', new.id,
    'region_id', new.region_id,
    'city', new.city,
    'category', new.category,
    'is_emergency', new.is_emergency,
    'need_title', new.title,
    'deep_link', '/detail/vora-hizmetler/request/' || new.id::text
  );

  select coalesce((value->>'max_recipients')::int, 150) into v_max_recipients
  from public.app_system_config where key = 'vora_hizmetler_push';

  select coalesce((value->>'nearby_radius_km')::double precision, 15) * 1000 into v_radius_m
  from public.app_system_config where key = 'vora_hizmetler_push';

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select distinct on (sp.user_id)
    sp.user_id,
    'vora_service_request_published'::public.notification_event_type,
    v_push_title,
    v_push_body,
    v_data,
    new.requester_id
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (new.region_id is null or sp.region_id = new.region_id)
    and (
      new.location is null
      or sp.location is null
      or st_dwithin(sp.location, new.location, v_radius_m)
    )
  order by sp.user_id, sp.is_premium desc, sp.rating desc
  limit v_max_recipients;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  select distinct on (sp.user_id)
    sp.user_id,
    'vora_service_request_published'::public.notification_event_type,
    v_push_title,
    v_push_body,
    v_data,
    new.requester_id,
    'jobs'::public.notification_category,
    case when new.is_emergency then 'high'::public.notification_priority else 'normal'::public.notification_priority end
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (new.region_id is null or sp.region_id = new.region_id)
    and (
      new.location is null
      or sp.location is null
      or st_dwithin(sp.location, new.location, v_radius_m)
    )
  order by sp.user_id, sp.is_premium desc, sp.rating desc
  limit v_max_recipients;

  return new;
end;
$$;

drop trigger if exists vora_service_request_published_notify on public.vora_service_requests;
create trigger vora_service_request_published_notify
  after insert on public.vora_service_requests
  for each row execute function public.notify_vora_service_request_published();

-- Teklif kabul edildiğinde her iki tarafa bildirim
create or replace function public.notify_vora_service_offer_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_request record;
  v_provider record;
  v_data jsonb;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if new.status <> 'offer_accepted' or old.status = 'offer_accepted' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  select r.id, r.title, r.requester_id, r.accepted_provider_id
  into v_request
  from public.vora_service_requests r
  where r.id = new.id;

  if v_request.accepted_provider_id is null then return new; end if;

  select sp.id, sp.user_id, sp.display_name
  into v_provider
  from public.vora_service_providers sp
  where sp.id = v_request.accepted_provider_id;

  v_data := jsonb_build_object(
    'service_request_id', v_request.id,
    'request_id', v_request.id,
    'deep_link', '/detail/vora-hizmetler/request/' || v_request.id::text
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values
    (v_request.requester_id, 'vora_service_offer_accepted', 'Teklif kabul edildi', coalesce(v_provider.display_name, 'Usta') || ' ile eşleştiniz', v_data, v_provider.user_id),
    (v_provider.user_id, 'vora_service_offer_accepted', 'Teklifiniz kabul edildi', left(v_request.title, 120), v_data, v_request.requester_id);

  insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
  values
    (v_request.requester_id, 'vora_service_offer_accepted', 'Teklif kabul edildi', coalesce(v_provider.display_name, 'Usta') || ' ile eşleştiniz', v_data, v_provider.user_id, 'jobs', 'normal'),
    (v_provider.user_id, 'vora_service_offer_accepted', 'Teklifiniz kabul edildi', left(v_request.title, 120), v_data, v_request.requester_id, 'jobs', 'high');

  return new;
end;
$$;

drop trigger if exists vora_service_offer_accepted_notify on public.vora_service_requests;
create trigger vora_service_offer_accepted_notify
  after update of status on public.vora_service_requests
  for each row execute function public.notify_vora_service_offer_accepted();

-- Acil çağır: kategori + bölge ustalarına
create or replace function public.notify_vora_service_emergency_call()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_category_label text;
  v_city text;
  v_data jsonb;
  v_max int := 50;
begin
  if tg_op <> 'INSERT' then return new; end if;
  if not public.is_vora_hizmetler_push_enabled() then return new; end if;

  v_category_label := public.vora_service_category_label(new.category);
  v_city := coalesce(new.city, (select name from public.regions where id = new.region_id limit 1), 'Yakınınız');

  v_data := jsonb_build_object(
    'emergency_session_id', new.id,
    'category', new.category,
    'deep_link', '/vora-hizmetler/emergency'
  );

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select sp.user_id,
    'vora_service_emergency_call'::public.notification_event_type,
    'Acil ' || v_category_label || ' çağrısı',
    v_city || ' · Hemen yanıt verin',
    v_data,
    new.requester_id
  from public.vora_service_providers sp
  where sp.is_active = true
    and sp.user_id <> new.requester_id
    and new.category = any(sp.categories)
    and (new.region_id is null or sp.region_id = new.region_id)
  limit v_max;

  return new;
end;
$$;

drop trigger if exists vora_service_emergency_notify on public.vora_service_emergency_sessions;
create trigger vora_service_emergency_notify
  after insert on public.vora_service_emergency_sessions
  for each row execute function public.notify_vora_service_emergency_call();

-- Realtime harita
alter publication supabase_realtime add table public.vora_service_providers;
