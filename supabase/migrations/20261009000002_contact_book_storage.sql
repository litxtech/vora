-- Rehber kayıtları eşleştirme sırasında saklanır.
-- İzin iptali bu kayıtları silmez. Hesap silme tamamlanınca silinir.
-- Bu dosya incelenmeden üretimde çalıştırılmamalıdır.

create table if not exists public.user_contact_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  raw_phone text not null,
  e164 text,
  country_iso2 text,
  phone_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_contact_entries_owner_raw_key unique (owner_id, raw_phone),
  constraint user_contact_entries_raw_len check (char_length(raw_phone) between 1 and 40),
  constraint user_contact_entries_e164 check (e164 is null or e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint user_contact_entries_country check (country_iso2 is null or country_iso2 ~ '^[A-Z]{2}$'),
  constraint user_contact_entries_hash check (phone_hash is null or phone_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists user_contact_entries_country_idx
  on public.user_contact_entries (country_iso2, updated_at desc);

create index if not exists user_contact_entries_hash_idx
  on public.user_contact_entries (phone_hash)
  where phone_hash is not null;

alter table public.user_contact_entries enable row level security;
revoke all on table public.user_contact_entries from public, anon, authenticated;

create or replace function public.clear_contact_discovery_on_account_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_status = 'deleted' and old.account_status is distinct from 'deleted' then
    delete from public.contact_discovery_opt_ins where user_id = new.id;
    delete from public.contact_discovery_usage where user_id = new.id;
    delete from public.contact_discovery_events where user_id = new.id;
    delete from public.user_contact_entries where owner_id = new.id;
  end if;
  return new;
end;
$$;

drop function if exists public.match_contact_discovery(text[]);

create or replace function public.match_contact_discovery(p_entries jsonb)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  viewer_follows boolean,
  follows_viewer boolean,
  is_friend boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_pepper text;
  v_owned integer;
  v_used integer;
  v_remaining integer;
  v_match_count integer;
  v_today date := (timezone('utc', now()))::date;
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    return;
  end if;

  if jsonb_array_length(p_entries) > 200 then
    raise exception 'Çok fazla numara gönderildi. Lütfen daha küçük gruplar halinde deneyin.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.account_status = 'active'
      and p.deleted_at is null
      and coalesce(p.is_guest, false) = false
      and p.quarantined_at is null
  ) then
    raise exception 'Bu özellik için aktif bir hesap gerekir.';
  end if;

  if not public.check_rate_limit(v_uid, 'contact_discovery_match', 40, 3600) then
    raise exception 'Çok fazla eşleştirme denemesi. Lütfen bir süre sonra tekrar deneyin.';
  end if;

  select secret.pepper into v_pepper
  from private.contact_discovery_secret secret
  where secret.id = 1;

  if v_pepper is null then
    raise exception 'Eşleştirme şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
  end if;

  select count(*)::integer into v_owned
  from public.user_contact_entries
  where owner_id = v_uid;

  create temporary table if not exists _contact_incoming (
    raw_phone text primary key,
    e164 text,
    country_iso2 text,
    phone_hash text
  ) on commit drop;

  truncate _contact_incoming;

  insert into _contact_incoming (raw_phone, e164, country_iso2, phone_hash)
  select
    parsed.raw_phone,
    parsed.e164,
    parsed.country_iso2,
    case
      when parsed.e164 is null then null
      else encode(extensions.hmac(parsed.e164, v_pepper, 'sha256'), 'hex')
    end
  from (
    select distinct on (raw_phone)
      raw_phone,
      case when e164 ~ '^\+[1-9][0-9]{7,14}$' then e164 else null end as e164,
      case when country ~ '^[A-Z]{2}$' then country else null end as country_iso2
    from (
      select
        left(btrim(item->>'raw'), 40) as raw_phone,
        coalesce(item->>'e164', '') as e164,
        coalesce(item->>'country', '') as country
      from jsonb_array_elements(p_entries) item
    ) loose
    where raw_phone <> ''
    order by raw_phone
  ) parsed;

  update public.user_contact_entries entry
  set
    e164 = incoming.e164,
    country_iso2 = incoming.country_iso2,
    phone_hash = incoming.phone_hash,
    updated_at = now()
  from _contact_incoming incoming
  where entry.owner_id = v_uid
    and entry.raw_phone = incoming.raw_phone;

  insert into public.user_contact_entries (owner_id, raw_phone, e164, country_iso2, phone_hash)
  select v_uid, incoming.raw_phone, incoming.e164, incoming.country_iso2, incoming.phone_hash
  from _contact_incoming incoming
  where not exists (
    select 1
    from public.user_contact_entries entry
    where entry.owner_id = v_uid
      and entry.raw_phone = incoming.raw_phone
  )
  order by incoming.raw_phone
  limit greatest(0, 5000 - v_owned);

  select usage.lookup_count into v_used
  from public.contact_discovery_usage usage
  where usage.user_id = v_uid
    and usage.usage_day = v_today;

  v_remaining := greatest(0, 1000 - coalesce(v_used, 0));

  select count(*)::integer into v_match_count
  from (
    select distinct incoming.phone_hash
    from _contact_incoming incoming
    where incoming.phone_hash is not null
    limit v_remaining
  ) capped;

  if v_match_count > 0 then
    insert into public.contact_discovery_usage (user_id, usage_day, lookup_count)
    values (v_uid, v_today, v_match_count)
    on conflict (user_id, usage_day) do update
      set lookup_count = public.contact_discovery_usage.lookup_count + excluded.lookup_count;

    insert into public.contact_discovery_events (user_id, kind, phone_count)
    values (v_uid, 'match_run', v_match_count);
  end if;

  return query
  with matchable as (
    select distinct incoming.phone_hash
    from _contact_incoming incoming
    where incoming.phone_hash is not null
    limit v_remaining
  ),
  matched as (
    select
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.is_verified,
      public.can_view_profile_row(p.id) as can_view,
      exists (
        select 1 from public.follows viewer_follow
        where viewer_follow.follower_id = v_uid
          and viewer_follow.following_id = p.id
      ) as viewer_follows,
      exists (
        select 1 from public.follows their_follow
        where their_follow.follower_id = p.id
          and their_follow.following_id = v_uid
      ) as follows_viewer
    from matchable needle
    join public.contact_discovery_opt_ins opt on opt.phone_hash = needle.phone_hash
    join public.profiles p on p.id = opt.user_id
    where p.id <> v_uid
      and p.account_status = 'active'
      and p.deleted_at is null
      and p.quarantined_at is null
      and not exists (
        select 1
        from public.user_blocks block
        where (block.blocker_id = v_uid and block.blocked_id = p.id)
           or (block.blocker_id = p.id and block.blocked_id = v_uid)
      )
  )
  select
    matched.id,
    matched.username,
    case when matched.can_view then matched.full_name else null end,
    case when matched.can_view then matched.avatar_url else null end,
    case when matched.can_view then matched.is_verified else false end,
    matched.viewer_follows,
    matched.follows_viewer,
    matched.viewer_follows and matched.follows_viewer
  from matched;
end;
$$;

create or replace function public.admin_contact_book_countries()
returns table (
  country_iso2 text,
  entry_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  return query
  select entry.country_iso2, count(*)::integer
  from public.user_contact_entries entry
  group by entry.country_iso2
  order by count(*) desc, entry.country_iso2 nulls last;
end;
$$;

create or replace function public.admin_list_contact_book(
  p_country text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  id uuid,
  raw_phone text,
  e164 text,
  country_iso2 text,
  owner_id uuid,
  owner_username text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 200), 1), 300);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  return query
  select
    entry.id,
    entry.raw_phone,
    entry.e164,
    entry.country_iso2,
    entry.owner_id,
    profile.username,
    entry.updated_at
  from public.user_contact_entries entry
  join public.profiles profile on profile.id = entry.owner_id
  where case
    when p_country is null or p_country = '' then true
    when p_country = 'UNKNOWN' then entry.country_iso2 is null
    else entry.country_iso2 = p_country
  end
  order by entry.updated_at desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.match_contact_discovery(jsonb) from public, anon;
revoke all on function public.admin_contact_book_countries() from public, anon;
revoke all on function public.admin_list_contact_book(text, integer, integer) from public, anon;
revoke all on function public.set_contact_discovery_phone(text, text) from public, anon, authenticated;
revoke all on function public.disable_contact_discovery() from public, anon, authenticated;
revoke all on function public.get_contact_discovery_status() from public, anon, authenticated;

grant execute on function public.match_contact_discovery(jsonb) to authenticated;
grant execute on function public.admin_contact_book_countries() to authenticated;
grant execute on function public.admin_list_contact_book(text, integer, integer) to authenticated;
