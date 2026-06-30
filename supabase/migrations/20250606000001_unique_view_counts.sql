-- Her hesap içerik başına yalnızca bir kez görüntülenme sayar.
-- Mevcut tekrarlayan kayıtları temizle, benzersiz indeksler ekle, RPC'leri güncelle.

-- post_views: aynı kullanıcı aynı gönderiyi tekrar sayamaz
delete from public.post_views a
using public.post_views b
where a.post_id = b.post_id
  and a.viewer_id = b.viewer_id
  and a.viewer_id is not null
  and a.id > b.id;

create unique index if not exists post_views_unique_viewer_idx
  on public.post_views (post_id, viewer_id)
  where viewer_id is not null;

-- profile_views: aynı kullanıcı aynı profili tekrar sayamaz
delete from public.profile_views a
using public.profile_views b
where a.profile_id = b.profile_id
  and a.viewer_id = b.viewer_id
  and a.viewer_id is not null
  and a.id > b.id;

create unique index if not exists profile_views_unique_viewer_idx
  on public.profile_views (profile_id, viewer_id)
  where viewer_id is not null;

-- reel_views
create table if not exists public.reel_views (
  reel_id uuid not null references public.reels (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, viewer_id)
);

create index if not exists reel_views_viewer_idx on public.reel_views (viewer_id, created_at desc);

alter table public.reel_views enable row level security;

create policy "reel_views_self_insert" on public.reel_views
  for insert with check (auth.uid() = viewer_id);

create policy "reel_views_author_read" on public.reel_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.reels r
      where r.id = reel_views.reel_id and r.author_id = auth.uid()
    )
  );

-- reel_complete_views (tam izleme)
create table if not exists public.reel_complete_views (
  reel_id uuid not null references public.reels (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, viewer_id)
);

alter table public.reel_complete_views enable row level security;

create policy "reel_complete_views_self_insert" on public.reel_complete_views
  for insert with check (auth.uid() = viewer_id);

create policy "reel_complete_views_author_read" on public.reel_complete_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.reels r
      where r.id = reel_complete_views.reel_id and r.author_id = auth.uid()
    )
  );

-- event_views (detail / map ayrı sayılır)
create table if not exists public.event_views (
  event_id uuid not null references public.events (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('detail', 'map')),
  created_at timestamptz not null default now(),
  primary key (event_id, viewer_id, source)
);

alter table public.event_views enable row level security;

create policy "event_views_self_insert" on public.event_views
  for insert with check (auth.uid() = viewer_id);

create policy "event_views_organizer_read" on public.event_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.events e
      where e.id = event_views.event_id and e.organizer_id = auth.uid()
    )
  );

-- lost_item_views
create table if not exists public.lost_item_views (
  item_id uuid not null references public.lost_items (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, viewer_id)
);

alter table public.lost_item_views enable row level security;

create policy "lost_item_views_self_insert" on public.lost_item_views
  for insert with check (auth.uid() = viewer_id);

create policy "lost_item_views_author_read" on public.lost_item_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.lost_items li
      where li.id = lost_item_views.item_id and li.author_id = auth.uid()
    )
  );

-- job_listing_views
create table if not exists public.job_listing_views (
  listing_id uuid not null references public.job_listings (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, viewer_id)
);

alter table public.job_listing_views enable row level security;

create policy "job_listing_views_self_insert" on public.job_listing_views
  for insert with check (auth.uid() = viewer_id);

create policy "job_listing_views_author_read" on public.job_listing_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.job_listings jl
      where jl.id = job_listing_views.listing_id and jl.author_id = auth.uid()
    )
  );

-- business_views
create table if not exists public.business_views (
  business_id uuid not null references public.businesses (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, viewer_id)
);

alter table public.business_views enable row level security;

create policy "business_views_self_insert" on public.business_views
  for insert with check (auth.uid() = viewer_id);

create policy "business_views_owner_read" on public.business_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.businesses b
      where b.id = business_views.business_id and b.owner_id = auth.uid()
    )
  );

-- void → boolean dönüş tipi değişiklikleri CREATE OR REPLACE ile yapılamaz; önce drop gerekir.
drop function if exists public.increment_event_view(uuid, text);
drop function if exists public.increment_event_view(uuid);
drop function if exists public.increment_lost_item_view(uuid);
drop function if exists public.increment_job_view_count(uuid);
drop function if exists public.increment_business_view_count(uuid);
drop function if exists public.record_post_view(uuid);
drop function if exists public.record_profile_view(uuid);
drop function if exists public.record_reel_view(uuid);
drop function if exists public.record_reel_complete_view(uuid);

-- Gönderi görüntülenmesi

create or replace function public.record_post_view(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_id uuid;
begin
  if v_viewer_id is null then
    insert into public.post_views (post_id, viewer_id, is_unique)
    values (p_post_id, null, true);
    update public.posts set view_count = view_count + 1 where id = p_post_id;
    return true;
  end if;

  insert into public.post_views (post_id, viewer_id, is_unique)
  values (p_post_id, v_viewer_id, true)
  on conflict do nothing
  returning id into v_inserted_id;

  if v_inserted_id is not null then
    update public.posts set view_count = view_count + 1 where id = p_post_id;
    return true;
  end if;

  return false;
end;
$$;

-- Profil görüntülenmesi
create or replace function public.record_profile_view(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_id uuid;
begin
  if v_viewer_id is null or v_viewer_id = p_profile_id then
    return false;
  end if;

  insert into public.profile_views (profile_id, viewer_id)
  values (p_profile_id, v_viewer_id)
  on conflict do nothing
  returning id into v_inserted_id;

  return v_inserted_id is not null;
end;
$$;

-- Reel görüntülenmesi
create or replace function public.record_reel_view(p_reel_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_reel_id uuid;
begin
  if v_viewer_id is null then
    return false;
  end if;

  insert into public.reel_views (reel_id, viewer_id)
  values (p_reel_id, v_viewer_id)
  on conflict do nothing
  returning reel_id into v_inserted_reel_id;

  if v_inserted_reel_id is not null then
    update public.reels set view_count = view_count + 1 where id = p_reel_id;
    return true;
  end if;

  return false;
end;
$$;

-- Reel tam izleme
create or replace function public.record_reel_complete_view(p_reel_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_reel_id uuid;
begin
  if v_viewer_id is null then
    return false;
  end if;

  insert into public.reel_complete_views (reel_id, viewer_id)
  values (p_reel_id, v_viewer_id)
  on conflict do nothing
  returning reel_id into v_inserted_reel_id;

  if v_inserted_reel_id is not null then
    update public.reels
    set completed_view_count = completed_view_count + 1
    where id = p_reel_id;
    return true;
  end if;

  return false;
end;
$$;

-- Etkinlik görüntülenmesi
create or replace function public.increment_event_view(p_event_id uuid, p_source text default 'detail')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_source text := coalesce(p_source, 'detail');
  v_inserted_event_id uuid;
begin
  if v_viewer_id is null then
    if v_source = 'map' then
      update public.events set map_view_count = map_view_count + 1 where id = p_event_id;
    else
      update public.events set view_count = view_count + 1 where id = p_event_id;
    end if;
    return true;
  end if;

  if v_source not in ('detail', 'map') then
    v_source := 'detail';
  end if;

  insert into public.event_views (event_id, viewer_id, source)
  values (p_event_id, v_viewer_id, v_source)
  on conflict do nothing
  returning event_id into v_inserted_event_id;

  if v_inserted_event_id is not null then
    if v_source = 'map' then
      update public.events set map_view_count = map_view_count + 1 where id = p_event_id;
    else
      update public.events set view_count = view_count + 1 where id = p_event_id;
    end if;
    return true;
  end if;

  return false;
end;
$$;

-- Kayıp/buluntu ilanı görüntülenmesi
create or replace function public.increment_lost_item_view(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_item_id uuid;
begin
  if v_viewer_id is null then
    update public.lost_items set view_count = view_count + 1 where id = p_item_id;
    return true;
  end if;

  insert into public.lost_item_views (item_id, viewer_id)
  values (p_item_id, v_viewer_id)
  on conflict do nothing
  returning item_id into v_inserted_item_id;

  if v_inserted_item_id is not null then
    update public.lost_items set view_count = view_count + 1 where id = p_item_id;
    return true;
  end if;

  return false;
end;
$$;

-- İş ilanı görüntülenmesi
create or replace function public.increment_job_view_count(listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_listing_id uuid;
begin
  if v_viewer_id is null then
    update public.job_listings
    set view_count = view_count + 1
    where id = listing_id and status = 'published';
    return true;
  end if;

  insert into public.job_listing_views (listing_id, viewer_id)
  values (listing_id, v_viewer_id)
  on conflict do nothing
  returning listing_id into v_inserted_listing_id;

  if v_inserted_listing_id is not null then
    update public.job_listings
    set view_count = view_count + 1
    where id = listing_id and status = 'published';
    return true;
  end if;

  return false;
end;
$$;

-- İşletme görüntülenmesi
create or replace function public.increment_business_view_count(p_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_inserted_business_id uuid;
begin
  if v_viewer_id is null then
    return false;
  end if;

  insert into public.business_views (business_id, viewer_id)
  values (p_business_id, v_viewer_id)
  on conflict do nothing
  returning business_id into v_inserted_business_id;

  if v_inserted_business_id is not null then
    update public.businesses set view_count = view_count + 1 where id = p_business_id;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.record_post_view(uuid) to anon, authenticated;
grant execute on function public.record_profile_view(uuid) to authenticated;
grant execute on function public.record_reel_view(uuid) to authenticated;
grant execute on function public.record_reel_complete_view(uuid) to authenticated;
grant execute on function public.increment_event_view(uuid, text) to anon, authenticated;
grant execute on function public.increment_lost_item_view(uuid) to anon, authenticated;
grant execute on function public.increment_job_view_count(uuid) to anon, authenticated;
grant execute on function public.increment_business_view_count(uuid) to authenticated;
