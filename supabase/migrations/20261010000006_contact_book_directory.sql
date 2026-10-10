-- Rehber kişilerinin adı ve sahibi.
-- Eşleştirme anahtarı olmasa da izin verilen rehber admin listesine yazılır.
-- Bu dosya incelenmeden üretimde çalıştırılmamalıdır.

alter table public.user_contact_entries
  add column if not exists display_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contact_entries_display_name_len'
  ) then
    alter table public.user_contact_entries
      add constraint user_contact_entries_display_name_len
      check (display_name is null or char_length(display_name) between 1 and 120);
  end if;
end $$;

create index if not exists user_contact_entries_owner_updated_idx
  on public.user_contact_entries (owner_id, updated_at desc);

create or replace function public.sync_contact_book(p_entries jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owned integer;
  v_saved integer := 0;
  v_batch integer := 0;
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    return 0;
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

  if not public.check_rate_limit(v_uid, 'contact_book_sync', 80, 3600) then
    raise exception 'Çok fazla rehber kaydı. Lütfen bir süre sonra tekrar deneyin.';
  end if;

  select count(*)::integer into v_owned
  from public.user_contact_entries
  where owner_id = v_uid;

  create temporary table if not exists _contact_sync (
    raw_phone text primary key,
    e164 text,
    country_iso2 text,
    display_name text
  ) on commit drop;

  truncate _contact_sync;

  insert into _contact_sync (raw_phone, e164, country_iso2, display_name)
  select
    parsed.raw_phone,
    parsed.e164,
    parsed.country_iso2,
    parsed.display_name
  from (
    select distinct on (raw_phone)
      raw_phone,
      case when e164 ~ '^\+[1-9][0-9]{7,14}$' then e164 else null end as e164,
      case when country ~ '^[A-Z]{2}$' then country else null end as country_iso2,
      case
        when char_length(display_name) between 1 and 120 then display_name
        else null
      end as display_name
    from (
      select
        left(btrim(item->>'raw'), 40) as raw_phone,
        coalesce(item->>'e164', '') as e164,
        coalesce(item->>'country', '') as country,
        left(btrim(coalesce(item->>'name', '')), 120) as display_name
      from jsonb_array_elements(p_entries) item
    ) loose
    where raw_phone <> ''
    order by raw_phone
  ) parsed;

  update public.user_contact_entries entry
  set
    e164 = incoming.e164,
    country_iso2 = incoming.country_iso2,
    display_name = coalesce(incoming.display_name, entry.display_name),
    updated_at = now()
  from _contact_sync incoming
  where entry.owner_id = v_uid
    and entry.raw_phone = incoming.raw_phone;

  get diagnostics v_saved = row_count;

  insert into public.user_contact_entries (owner_id, raw_phone, e164, country_iso2, display_name)
  select v_uid, incoming.raw_phone, incoming.e164, incoming.country_iso2, incoming.display_name
  from _contact_sync incoming
  where not exists (
    select 1
    from public.user_contact_entries entry
    where entry.owner_id = v_uid
      and entry.raw_phone = incoming.raw_phone
  )
  order by incoming.raw_phone
  limit greatest(0, 5000 - v_owned);

  get diagnostics v_batch = row_count;

  return v_saved + v_batch;
end;
$$;

drop function if exists public.match_contact_discovery(jsonb);

create function public.match_contact_discovery(p_entries jsonb)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_verified boolean,
  viewer_follows boolean,
  follows_viewer boolean,
  is_friend boolean,
  matched_e164 text
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

  drop table if exists _contact_incoming;
  create temporary table _contact_incoming (
    raw_phone text primary key,
    e164 text,
    country_iso2 text,
    phone_hash text,
    display_name text
  ) on commit drop;

  insert into _contact_incoming (raw_phone, e164, country_iso2, phone_hash, display_name)
  select
    parsed.raw_phone,
    parsed.e164,
    parsed.country_iso2,
    case
      when parsed.e164 is null then null
      else encode(extensions.hmac(parsed.e164, v_pepper, 'sha256'), 'hex')
    end,
    parsed.display_name
  from (
    select distinct on (raw_phone)
      raw_phone,
      case when e164 ~ '^\+[1-9][0-9]{7,14}$' then e164 else null end as e164,
      case when country ~ '^[A-Z]{2}$' then country else null end as country_iso2,
      case
        when char_length(display_name) between 1 and 120 then display_name
        else null
      end as display_name
    from (
      select
        left(btrim(item->>'raw'), 40) as raw_phone,
        coalesce(item->>'e164', '') as e164,
        coalesce(item->>'country', '') as country,
        left(btrim(coalesce(item->>'name', '')), 120) as display_name
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
    display_name = coalesce(incoming.display_name, entry.display_name),
    updated_at = now()
  from _contact_incoming incoming
  where entry.owner_id = v_uid
    and entry.raw_phone = incoming.raw_phone;

  insert into public.user_contact_entries (owner_id, raw_phone, e164, country_iso2, phone_hash, display_name)
  select v_uid, incoming.raw_phone, incoming.e164, incoming.country_iso2, incoming.phone_hash, incoming.display_name
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
      incoming.e164 as matched_e164,
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
    join _contact_incoming incoming on incoming.phone_hash = needle.phone_hash
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
    matched.viewer_follows and matched.follows_viewer,
    matched.matched_e164
  from matched;
end;
$$;

create or replace function public.admin_contact_book_owners()
returns table (
  owner_id uuid,
  owner_username text,
  owner_full_name text,
  owner_avatar_url text,
  entry_count integer,
  updated_at timestamptz
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
  select
    entry.owner_id,
    profile.username,
    profile.full_name,
    profile.avatar_url,
    count(*)::integer,
    max(entry.updated_at)
  from public.user_contact_entries entry
  join public.profiles profile on profile.id = entry.owner_id
  group by entry.owner_id, profile.username, profile.full_name, profile.avatar_url
  order by max(entry.updated_at) desc;
end;
$$;

create or replace function public.admin_list_owner_contact_book(
  p_owner_id uuid,
  p_limit integer default 400,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  raw_phone text,
  e164 text,
  country_iso2 text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 400), 1), 500);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  if p_owner_id is null then
    raise exception 'Rehber sahibi seçilmedi.';
  end if;

  return query
  select
    entry.id,
    entry.display_name,
    entry.raw_phone,
    entry.e164,
    entry.country_iso2,
    entry.updated_at
  from public.user_contact_entries entry
  where entry.owner_id = p_owner_id
  order by entry.display_name nulls last, entry.raw_phone
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.sync_contact_book(jsonb) from public, anon;
revoke all on function public.match_contact_discovery(jsonb) from public, anon;
revoke all on function public.admin_contact_book_owners() from public, anon;
revoke all on function public.admin_list_owner_contact_book(uuid, integer, integer) from public, anon;

grant execute on function public.sync_contact_book(jsonb) to authenticated;
grant execute on function public.match_contact_discovery(jsonb) to authenticated;
grant execute on function public.admin_contact_book_owners() to authenticated;
grant execute on function public.admin_list_owner_contact_book(uuid, integer, integer) to authenticated;
