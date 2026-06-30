-- Kampanyalar, gönderi kitlesi ve premium profil öne çıkarma

-- Gönderi kitlesi (yakın çevre gating)
create type public.post_audience as enum (
  'public',
  'friends',
  'close_friends'
);

alter table public.posts
  add column if not exists audience public.post_audience not null default 'public';

create index if not exists posts_audience_idx on public.posts (audience);

-- İşletme kampanyaları
create table public.business_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null,
  description text not null,
  image_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index business_campaigns_business_idx on public.business_campaigns (business_id, created_at desc);

-- Premium profil öne çıkarma
alter table public.profiles
  add column if not exists profile_boosted_until timestamptz;

-- RLS
alter table public.business_campaigns enable row level security;

create policy "business_campaigns_public_read" on public.business_campaigns
  for select using (status = 'published');

create policy "business_campaigns_owner_write" on public.business_campaigns
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = business_campaigns.business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_campaigns.business_id and b.owner_id = auth.uid()
    )
  );

-- Yakın arkadaş kontrolü (gönderi görünürlüğü)
create or replace function public.can_view_post_audience(
  p_post_id uuid,
  p_viewer_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_audience public.post_audience;
begin
  select author_id, audience into v_author_id, v_audience
  from public.posts where id = p_post_id and status = 'published';

  if not found then
    return false;
  end if;
  if p_viewer_id is null then
    return v_audience = 'public';
  end if;
  if p_viewer_id = v_author_id then
    return true;
  end if;

  case v_audience
    when 'public' then return true;
    when 'friends' then
      return exists (
        select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.sender_id = p_viewer_id and fr.receiver_id = v_author_id)
            or (fr.sender_id = v_author_id and fr.receiver_id = p_viewer_id)
          )
      );
    when 'close_friends' then
      return exists (
        select 1 from public.close_friends cf
        where cf.user_id = v_author_id and cf.friend_id = p_viewer_id
      );
    else return false;
  end case;
end;
$$;
