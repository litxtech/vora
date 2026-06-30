-- Profil ileri aşama: premium abonelik, premium rozet, reel istatistikleri, profil RLS

-- Premium rozet türü
alter type public.badge_type add value if not exists 'premium';

-- Premium abonelikler (idempotent)
do $$ begin
  create type public.premium_plan as enum ('monthly', 'yearly');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum ('active', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan public.premium_plan not null default 'monthly',
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists premium_subscriptions_user_idx
  on public.premium_subscriptions (user_id, expires_at desc);

-- Reel istatistikleri
alter table public.reels
  add column if not exists share_count integer not null default 0,
  add column if not exists save_count integer not null default 0,
  add column if not exists completed_view_count integer not null default 0,
  add column if not exists completion_rate numeric(5, 4) not null default 0;

create table if not exists public.reel_saves (
  reel_id uuid not null references public.reels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

alter table public.reel_saves enable row level security;
drop policy if exists "reel_saves_self_all" on public.reel_saves;
create policy "reel_saves_self_all" on public.reel_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Premium abonelik RLS
alter table public.premium_subscriptions enable row level security;
drop policy if exists "premium_subscriptions_self_read" on public.premium_subscriptions;
create policy "premium_subscriptions_self_read" on public.premium_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "premium_subscriptions_self_insert" on public.premium_subscriptions;
create policy "premium_subscriptions_self_insert" on public.premium_subscriptions
  for insert with check (auth.uid() = user_id);

-- Premium durumu senkronizasyonu
create or replace function public.sync_premium_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  select exists (
    select 1 from public.premium_subscriptions
    where user_id = p_user_id
      and status = 'active'
      and expires_at > now()
  ) into v_active;

  update public.profiles
  set is_premium = v_active, updated_at = now()
  where id = p_user_id;

  if v_active then
    insert into public.user_badges (user_id, badge_type)
    values (p_user_id, 'premium')
    on conflict do nothing;
  else
    delete from public.user_badges
    where user_id = p_user_id and badge_type = 'premium';
  end if;
end;
$$;

create or replace function public.on_premium_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_premium_status(new.user_id);
  return new;
end;
$$;

drop trigger if exists premium_subscription_sync on public.premium_subscriptions;
create trigger premium_subscription_sync
  after insert or update on public.premium_subscriptions
  for each row execute function public.on_premium_subscription_change();

-- Reel tam izleme oranı güncelleme
create or replace function public.update_reel_completion_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.view_count > 0 then
    new.completion_rate := least(1, new.completed_view_count::numeric / new.view_count::numeric);
  end if;
  return new;
end;
$$;

drop trigger if exists reels_completion_rate_sync on public.reels;
create trigger reels_completion_rate_sync
  before update of view_count, completed_view_count on public.reels
  for each row execute function public.update_reel_completion_rate();

-- Profil görünürlük RLS
create or replace function public.can_view_profile_row(p_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibility public.profile_visibility;
  v_is_guest boolean;
begin
  if auth.uid() = p_profile_id then
    return true;
  end if;
  if auth.uid() is null then
    select profile_visibility into v_visibility from public.profiles where id = p_profile_id;
    return v_visibility = 'public';
  end if;

  select profile_visibility into v_visibility from public.profiles where id = p_profile_id;
  if not found then
    return false;
  end if;

  select coalesce(is_guest, false) into v_is_guest from public.profiles where id = auth.uid();

  case v_visibility
    when 'public' then return true;
    when 'members' then return not v_is_guest;
    when 'friends' then
      return not v_is_guest and exists (
        select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.sender_id = auth.uid() and fr.receiver_id = p_profile_id)
            or (fr.sender_id = p_profile_id and fr.receiver_id = auth.uid())
          )
      );
    else return false;
  end case;
end;
$$;

drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_visibility_read" on public.profiles;

create policy "profiles_visibility_read" on public.profiles
  for select using (public.can_view_profile_row(id));
