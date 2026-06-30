-- Push bildirimleri, ses ayarları ve arkadaşlık istekleri

create type public.notification_event_type as enum (
  'like',
  'comment',
  'comment_reply',
  'quote',
  'follow',
  'friend_request',
  'friend_accepted',
  'message',
  'mention',
  'reel_like',
  'emergency',
  'job',
  'event_nearby',
  'incident_update',
  'call_incoming',
  'save'
);

create type public.push_platform as enum ('ios', 'android', 'web');

create type public.friend_request_status as enum ('pending', 'accepted', 'declined');

-- Cihaz push tokenları
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform public.push_platform not null,
  expo_push_token text,
  device_push_token text,
  device_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index push_tokens_user_idx on public.push_tokens (user_id) where is_active = true;

-- Admin bildirim ses ayarları (özellik başına)
create table public.notification_sound_settings (
  event_type public.notification_event_type primary key,
  label text not null,
  sound_storage_path text,
  sound_filename text,
  sound_url text,
  duration_seconds numeric(4, 1),
  is_custom_enabled boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Varsayılan kayıtlar
insert into public.notification_sound_settings (event_type, label) values
  ('like', 'Beğeni'),
  ('comment', 'Yorum'),
  ('comment_reply', 'Yorum Yanıtı'),
  ('quote', 'Alıntı'),
  ('follow', 'Takip'),
  ('friend_request', 'Arkadaşlık İsteği'),
  ('friend_accepted', 'Arkadaş Kabul'),
  ('message', 'Mesaj'),
  ('mention', 'Bahsetme'),
  ('reel_like', 'Reel Beğeni'),
  ('emergency', 'Acil Durum'),
  ('job', 'İş İlanı'),
  ('event_nearby', 'Yakındaki Etkinlik'),
  ('incident_update', 'Olay Gelişmesi'),
  ('call_incoming', 'Gelen Arama'),
  ('save', 'Kaydetme')
on conflict (event_type) do nothing;

-- Uygulama içi bildirimler
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.notification_event_type not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  actor_id uuid references public.profiles (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- Arkadaşlık istekleri
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (sender_id <> receiver_id),
  unique (sender_id, receiver_id)
);

create index friend_requests_receiver_idx on public.friend_requests (receiver_id, status);

-- Bildirim kuyruğu (edge function işler)
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.notification_event_type not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  actor_id uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notification_outbox_pending_idx on public.notification_outbox (created_at)
  where processed_at is null;

create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

create trigger notification_sound_settings_updated_at
  before update on public.notification_sound_settings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.push_tokens enable row level security;
alter table public.notification_sound_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.friend_requests enable row level security;
alter table public.notification_outbox enable row level security;

create policy "push_tokens_self_all" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_sound_settings_public_read" on public.notification_sound_settings
  for select using (true);

create policy "notification_sound_settings_admin_write" on public.notification_sound_settings
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

create policy "notifications_self_read" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_self_update" on public.notifications
  for update using (auth.uid() = user_id);

create policy "friend_requests_involved_read" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friend_requests_sender_insert" on public.friend_requests
  for insert with check (auth.uid() = sender_id);

create policy "friend_requests_receiver_update" on public.friend_requests
  for update using (auth.uid() = receiver_id or auth.uid() = sender_id);

-- Bildirim ses storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notification-sounds',
  'notification-sounds',
  true,
  524288,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/x-caf']
)
on conflict (id) do nothing;

create policy "Bildirim sesleri herkese açık"
on storage.objects for select
using (bucket_id = 'notification-sounds');

create policy "Admin bildirim sesi yükleyebilir"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'notification-sounds'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

create policy "Admin bildirim sesi güncelleyebilir"
on storage.objects for update
to authenticated
using (
  bucket_id = 'notification-sounds'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

create policy "Admin bildirim sesi silebilir"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'notification-sounds'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  )
);

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.notification_sound_settings;
