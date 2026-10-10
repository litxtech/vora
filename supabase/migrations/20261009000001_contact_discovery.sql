-- Rehber eşleştirme: kullanıcının kendi numarası HMAC olarak saklanır.
-- Sorgulanan rehber numaraları tabloya yazılmaz. Üretimde bu dosya incelenmeden çalıştırılmamalıdır.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.contact_discovery_secret (
  id smallint primary key check (id = 1),
  pepper text not null
);

insert into private.contact_discovery_secret (id, pepper)
select 1, encode(extensions.gen_random_bytes(32), 'hex')
where not exists (select 1 from private.contact_discovery_secret where id = 1);

revoke all on table private.contact_discovery_secret from public, anon, authenticated;

create table if not exists public.contact_discovery_opt_ins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone_hash text not null unique,
  phone_hint text not null,
  country_iso2 text not null,
  consented_at timestamptz not null default now(),
  constraint contact_discovery_phone_hash_hex check (phone_hash ~ '^[0-9a-f]{64}$'),
  constraint contact_discovery_country_iso2 check (country_iso2 ~ '^[A-Z]{2}$'),
  constraint contact_discovery_phone_hint_len check (char_length(phone_hint) between 4 and 16)
);

create table if not exists public.contact_discovery_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_day date not null,
  lookup_count integer not null default 0 check (lookup_count >= 0),
  primary key (user_id, usage_day)
);

create table if not exists public.contact_discovery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('opt_in', 'opt_out', 'match_run')),
  phone_count integer not null check (phone_count between 0 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists contact_discovery_events_created_idx
  on public.contact_discovery_events (created_at);

alter table public.contact_discovery_opt_ins enable row level security;
alter table public.contact_discovery_usage enable row level security;
alter table public.contact_discovery_events enable row level security;

revoke all on table public.contact_discovery_opt_ins from public, anon, authenticated;
revoke all on table public.contact_discovery_usage from public, anon, authenticated;
revoke all on table public.contact_discovery_events from public, anon, authenticated;

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
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_clear_contact_discovery on public.profiles;
create trigger profiles_clear_contact_discovery
  after update of account_status on public.profiles
  for each row execute function public.clear_contact_discovery_on_account_delete();

create or replace function public.get_contact_discovery_status()
returns table (
  enabled boolean,
  phone_hint text,
  consented_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;

  return query
  select
    o.user_id is not null,
    o.phone_hint,
    o.consented_at
  from (select v_uid as uid) viewer
  left join public.contact_discovery_opt_ins o on o.user_id = viewer.uid;
end;
$$;

create or replace function public.set_contact_discovery_phone(
  p_e164 text,
  p_country_iso2 text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_pepper text;
  v_hash text;
  v_hint text;
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;

  if p_e164 is null or p_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Geçerli bir telefon numarası girin.';
  end if;

  if p_country_iso2 is null or p_country_iso2 !~ '^[A-Z]{2}$' then
    raise exception 'Ülke kodu geçersiz.';
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

  select secret.pepper into v_pepper
  from private.contact_discovery_secret secret
  where secret.id = 1;

  if v_pepper is null then
    raise exception 'Eşleştirme şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
  end if;

  v_hash := encode(extensions.hmac(p_e164, v_pepper, 'sha256'), 'hex');
  v_hint := '•••• ' || right(regexp_replace(p_e164, '\D', '', 'g'), 4);

  if exists (
    select 1
    from public.contact_discovery_opt_ins existing
    where existing.phone_hash = v_hash
      and existing.user_id <> v_uid
  ) then
    raise exception 'Bu numara başka bir hesapta kayıtlı.';
  end if;

  insert into public.contact_discovery_opt_ins (user_id, phone_hash, phone_hint, country_iso2, consented_at)
  values (v_uid, v_hash, v_hint, p_country_iso2, now())
  on conflict (user_id) do update
    set phone_hash = excluded.phone_hash,
        phone_hint = excluded.phone_hint,
        country_iso2 = excluded.country_iso2,
        consented_at = excluded.consented_at;

  insert into public.contact_discovery_events (user_id, kind, phone_count)
  values (v_uid, 'opt_in', 1);
end;
$$;

create or replace function public.disable_contact_discovery()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;

  delete from public.contact_discovery_opt_ins where user_id = v_uid;

  if found then
    insert into public.contact_discovery_events (user_id, kind, phone_count)
    values (v_uid, 'opt_out', 0);
  end if;
end;
$$;

create or replace function public.match_contact_discovery(p_phones text[])
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
  v_count integer;
  v_today date := (timezone('utc', now()))::date;
  v_used integer;
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;

  if p_phones is null or cardinality(p_phones) = 0 then
    return;
  end if;

  if cardinality(p_phones) > 100 then
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

  select count(distinct raw)::integer into v_count
  from unnest(p_phones) as raw
  where raw ~ '^\+[1-9][0-9]{7,14}$';

  if v_count = 0 then
    return;
  end if;

  select usage.lookup_count into v_used
  from public.contact_discovery_usage usage
  where usage.user_id = v_uid
    and usage.usage_day = v_today;

  if coalesce(v_used, 0) + v_count > 1000 then
    raise exception 'Günlük eşleştirme sınırına ulaşıldı. Yarın tekrar deneyebilirsiniz.';
  end if;

  if not public.check_rate_limit(v_uid, 'contact_discovery_match', 12, 3600) then
    raise exception 'Çok fazla eşleştirme denemesi. Lütfen bir süre sonra tekrar deneyin.';
  end if;

  select secret.pepper into v_pepper
  from private.contact_discovery_secret secret
  where secret.id = 1;

  if v_pepper is null then
    raise exception 'Eşleştirme şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
  end if;

  insert into public.contact_discovery_usage (user_id, usage_day, lookup_count)
  values (v_uid, v_today, v_count)
  on conflict (user_id, usage_day) do update
    set lookup_count = public.contact_discovery_usage.lookup_count + excluded.lookup_count;

  insert into public.contact_discovery_events (user_id, kind, phone_count)
  values (v_uid, 'match_run', v_count);

  delete from public.contact_discovery_events expired
  where expired.id in (
    select old_event.id
    from public.contact_discovery_events old_event
    where old_event.created_at < now() - interval '90 days'
    limit 200
  );

  delete from public.contact_discovery_usage stale
  where stale.usage_day < v_today - 2;

  return query
  with incoming as (
    select distinct encode(extensions.hmac(raw, v_pepper, 'sha256'), 'hex') as phone_hash
    from unnest(p_phones) as raw
    where raw ~ '^\+[1-9][0-9]{7,14}$'
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
    from incoming i
    join public.contact_discovery_opt_ins opt on opt.phone_hash = i.phone_hash
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

revoke all on function public.get_contact_discovery_status() from public, anon;
revoke all on function public.set_contact_discovery_phone(text, text) from public, anon;
revoke all on function public.disable_contact_discovery() from public, anon;
revoke all on function public.match_contact_discovery(text[]) from public, anon;
revoke all on function public.clear_contact_discovery_on_account_delete() from public, anon, authenticated;

grant execute on function public.get_contact_discovery_status() to authenticated;
grant execute on function public.set_contact_discovery_phone(text, text) to authenticated;
grant execute on function public.disable_contact_discovery() to authenticated;
grant execute on function public.match_contact_discovery(text[]) to authenticated;
