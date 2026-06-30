-- Yerel Pazar — hesap başına tek görüntülenme

create table if not exists public.marketplace_listing_views (
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, viewer_id)
);

create index if not exists marketplace_listing_views_listing_idx
  on public.marketplace_listing_views (listing_id, created_at desc);

alter table public.marketplace_listing_views enable row level security;

drop policy if exists marketplace_listing_views_self_insert on public.marketplace_listing_views;
create policy marketplace_listing_views_self_insert on public.marketplace_listing_views
  for insert with check (auth.uid() = viewer_id);

drop policy if exists marketplace_listing_views_author_read on public.marketplace_listing_views;
create policy marketplace_listing_views_author_read on public.marketplace_listing_views
  for select using (
    auth.uid() = viewer_id
    or exists (
      select 1 from public.marketplace_listings l
      where l.id = marketplace_listing_views.listing_id and l.author_id = auth.uid()
    )
  );

drop function if exists public.increment_marketplace_view(uuid);

create or replace function public.increment_marketplace_view(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_author_id uuid;
  v_inserted_listing_id uuid;
begin
  select author_id into v_author_id
  from public.marketplace_listings
  where id = p_listing_id
    and content_status = 'published'
    and status in ('active', 'reserved');

  if not found then
    return false;
  end if;

  if v_viewer_id is null then
    update public.marketplace_listings
    set view_count = view_count + 1
    where id = p_listing_id;
    return true;
  end if;

  if v_viewer_id = v_author_id then
    return false;
  end if;

  insert into public.marketplace_listing_views (listing_id, viewer_id)
  values (p_listing_id, v_viewer_id)
  on conflict do nothing
  returning listing_id into v_inserted_listing_id;

  if v_inserted_listing_id is not null then
    update public.marketplace_listings
    set view_count = view_count + 1
    where id = p_listing_id;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.increment_marketplace_view(uuid) to anon, authenticated;
