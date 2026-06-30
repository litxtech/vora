-- BÖLÜM 14 — Kayıp Merkezi (Kayıp Hayvan, İnsan, Eşya, Buluntu)

alter type public.notification_event_type add value if not exists 'lost_item_nearby';
alter type public.notification_event_type add value if not exists 'lost_item_tip';

create type public.lost_item_category as enum (
  'animal',
  'person',
  'item',
  'document',
  'other'
);

alter table public.lost_items
  add column if not exists category public.lost_item_category not null default 'other',
  add column if not exists district text,
  add column if not exists location_name text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists view_count integer not null default 0,
  add column if not exists is_urgent boolean not null default false,
  add column if not exists reward_amount text;

create index if not exists lost_items_region_status_idx
  on public.lost_items (region_id, status, created_at desc);

create index if not exists lost_items_category_idx
  on public.lost_items (region_id, category, item_type, status);

create index if not exists lost_items_author_idx
  on public.lost_items (author_id, created_at desc);

-- İhbar / ipucu
create table public.lost_item_tips (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.lost_items (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  contact_info text,
  created_at timestamptz not null default now()
);

create index lost_item_tips_item_idx on public.lost_item_tips (lost_item_id, created_at desc);

-- Konum güncelleme
create or replace function public.set_lost_item_location(p_item_id uuid, lng double precision, lat double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lost_items
  set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      updated_at = now()
  where id = p_item_id and author_id = auth.uid();
end;
$$;

create or replace function public.increment_lost_item_view(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lost_items set view_count = view_count + 1 where id = p_item_id;
end;
$$;

-- Bölgesel bildirim
create or replace function public.notify_lost_item_nearby()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if new.status <> 'open' then
    return new;
  end if;

  v_label := case new.item_type
    when 'lost' then 'Yeni kayıp ilanı'
    else 'Yeni buluntu ilanı'
  end;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  select
    p.id,
    'lost_item_nearby'::public.notification_event_type,
    v_label,
    left(new.title, 180),
    jsonb_build_object('lost_item_id', new.id, 'region_id', new.region_id, 'item_type', new.item_type),
    new.author_id
  from public.profiles p
  join public.regional_alert_subscriptions ras on ras.user_id = p.id and ras.region_id = new.region_id
  where p.id <> new.author_id
    and p.account_status = 'active'
    and ras.notify_events = true
    and coalesce((p.notification_prefs->>'nearby_events')::boolean, true) = true
  limit 200;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    p.id,
    'lost_item_nearby'::public.notification_event_type,
    v_label,
    left(new.title, 180),
    jsonb_build_object('lost_item_id', new.id, 'region_id', new.region_id, 'item_type', new.item_type),
    new.author_id
  from public.profiles p
  join public.regional_alert_subscriptions ras on ras.user_id = p.id and ras.region_id = new.region_id
  where p.id <> new.author_id
    and p.account_status = 'active'
    and ras.notify_events = true
    and coalesce((p.notification_prefs->>'nearby_events')::boolean, true) = true
  limit 200;

  return new;
end;
$$;

drop trigger if exists lost_item_regional_notify on public.lost_items;
create trigger lost_item_regional_notify
  after insert on public.lost_items
  for each row execute function public.notify_lost_item_nearby();

-- İpucu bildirimi
create or replace function public.notify_lost_item_tip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_title text;
begin
  select author_id, title into v_author_id, v_title from public.lost_items where id = new.lost_item_id;
  if v_author_id is null or v_author_id = new.reporter_id then
    return new;
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    v_author_id,
    'lost_item_tip'::public.notification_event_type,
    'Kayıp ilanına ipucu',
    left(new.message, 180),
    jsonb_build_object('lost_item_id', new.lost_item_id, 'tip_id', new.id),
    new.reporter_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_author_id,
    'lost_item_tip'::public.notification_event_type,
    'Kayıp ilanına ipucu',
    left(new.message, 180),
    jsonb_build_object('lost_item_id', new.lost_item_id, 'tip_id', new.id),
    new.reporter_id
  );

  return new;
end;
$$;

drop trigger if exists lost_item_tip_notify on public.lost_item_tips;
create trigger lost_item_tip_notify
  after insert on public.lost_item_tips
  for each row execute function public.notify_lost_item_tip();

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
    when 'lost_item' then
      select author_id into v_user_id from public.lost_items where id = p_target_id;
      return v_user_id;
    else return null;
  end case;
end;
$$;

-- Admin listesi
create or replace function public.get_admin_lost_items(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t))
    from (
      select
        li.id, li.title, li.description, li.item_type, li.category,
        li.status, li.is_urgent, li.region_id, li.created_at,
        p.username as author_username
      from public.lost_items li
      join public.profiles p on p.id = li.author_id
      order by li.created_at desc
      limit greatest(1, least(p_limit, 100))
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_remove_lost_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;
  update public.lost_items set status = 'resolved', resolved_at = now(), updated_at = now() where id = p_item_id;
end;
$$;

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lost-items',
  'lost-items',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "Kayıp ilanı görselleri herkese açık"
on storage.objects for select using (bucket_id = 'lost-items');

create policy "Kullanıcı kayıp ilanı görseli yükleyebilir"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'lost-items'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Kullanıcı kayıp ilanı görselini güncelleyebilir"
on storage.objects for update to authenticated
using (
  bucket_id = 'lost-items'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS
alter table public.lost_item_tips enable row level security;

drop policy if exists "lost_items_public_read" on public.lost_items;
create policy "lost_items_public_read" on public.lost_items
  for select using (status = 'open' or author_id = auth.uid());

create policy "lost_items_author_insert" on public.lost_items
  for insert with check (auth.uid() = author_id);

create policy "lost_items_author_update" on public.lost_items
  for update using (auth.uid() = author_id);

create policy "lost_item_tips_public_read" on public.lost_item_tips
  for select using (
    exists (
      select 1 from public.lost_items li
      where li.id = lost_item_tips.lost_item_id
        and (li.author_id = auth.uid() or li.status = 'open')
    )
  );

create policy "lost_item_tips_reporter_insert" on public.lost_item_tips
  for insert with check (auth.uid() = reporter_id);

create trigger lost_items_updated_at
  before update on public.lost_items
  for each row execute function public.set_updated_at();
