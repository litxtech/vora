-- Vora Müzik süre hakkı: hesap başına 10 dk ücretsiz, satın alma ve admin tanımı.

create table if not exists public.ai_music_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_sec integer not null default 0,
  reserved_sec integer not null default 0,
  spent_sec integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint ai_music_balances_nonneg check (
    granted_sec >= 0
    and reserved_sec >= 0
    and spent_sec >= 0
    and granted_sec >= reserved_sec + spent_sec
  )
);

create table if not exists public.ai_music_minute_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seconds integer not null check (seconds > 0),
  source text not null check (source in ('free', 'purchase', 'admin')),
  package_id text,
  amount_minor integer,
  currency text,
  stripe_session_id text,
  granted_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_music_minute_ledger_free_uidx
  on public.ai_music_minute_ledger (user_id)
  where source = 'free';

create unique index if not exists ai_music_minute_ledger_session_uidx
  on public.ai_music_minute_ledger (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists ai_music_minute_ledger_user_idx
  on public.ai_music_minute_ledger (user_id, created_at desc);

create table if not exists public.ai_music_reservations (
  work_id uuid primary key references public.ai_music_works(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seconds integer not null check (seconds > 0),
  status text not null check (status in ('reserved', 'spent', 'released')),
  created_at timestamptz not null default now()
);

alter table public.ai_music_balances enable row level security;
alter table public.ai_music_minute_ledger enable row level security;
alter table public.ai_music_reservations enable row level security;

drop policy if exists ai_music_balances_select on public.ai_music_balances;
create policy ai_music_balances_select on public.ai_music_balances
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists ai_music_minute_ledger_select on public.ai_music_minute_ledger;
create policy ai_music_minute_ledger_select on public.ai_music_minute_ledger
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists ai_music_reservations_select on public.ai_music_reservations;
create policy ai_music_reservations_select on public.ai_music_reservations
  for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.ai_music_balance_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'granted_sec', b.granted_sec,
    'reserved_sec', b.reserved_sec,
    'spent_sec', b.spent_sec,
    'available_sec', greatest(0, b.granted_sec - b.reserved_sec - b.spent_sec)
  )
  from public.ai_music_balances b
  where b.user_id = p_user_id;
$$;

create or replace function public.ensure_ai_music_balance(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  added integer := 0;
begin
  if p_user_id is null then
    raise exception 'Hesap gerekli';
  end if;

  insert into public.ai_music_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.ai_music_minute_ledger (user_id, seconds, source)
  values (p_user_id, 600, 'free')
  on conflict (user_id) where source = 'free' do nothing
  returning seconds into added;

  if coalesce(added, 0) > 0 then
    update public.ai_music_balances
    set granted_sec = granted_sec + added,
        updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.get_ai_music_balance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Giriş gerekli';
  end if;
  perform public.ensure_ai_music_balance(uid);
  return public.ai_music_balance_json(uid);
end;
$$;

create or replace function public.reserve_ai_music_seconds(
  p_user_id uuid,
  p_work_id uuid,
  p_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bal public.ai_music_balances%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Yetkisiz';
  end if;
  if p_seconds is null or p_seconds < 10 or p_seconds > 180 then
    raise exception 'Geçersiz süre';
  end if;

  perform public.ensure_ai_music_balance(p_user_id);

  if exists (select 1 from public.ai_music_reservations where work_id = p_work_id) then
    return public.ai_music_balance_json(p_user_id);
  end if;

  select * into bal
  from public.ai_music_balances
  where user_id = p_user_id
  for update;

  if bal.granted_sec - bal.reserved_sec - bal.spent_sec < p_seconds then
    raise exception 'Yetersiz müzik süresi';
  end if;

  insert into public.ai_music_reservations (work_id, user_id, seconds, status)
  values (p_work_id, p_user_id, p_seconds, 'reserved');

  update public.ai_music_balances
  set reserved_sec = reserved_sec + p_seconds,
      updated_at = now()
  where user_id = p_user_id;

  return public.ai_music_balance_json(p_user_id);
end;
$$;

create or replace function public.settle_ai_music_seconds(p_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  res public.ai_music_reservations%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Yetkisiz';
  end if;

  select * into res
  from public.ai_music_reservations
  where work_id = p_work_id
  for update;

  if res.work_id is null or res.status <> 'reserved' then
    return;
  end if;

  update public.ai_music_balances
  set reserved_sec = reserved_sec - res.seconds,
      spent_sec = spent_sec + res.seconds,
      updated_at = now()
  where user_id = res.user_id;

  update public.ai_music_reservations
  set status = 'spent'
  where work_id = p_work_id;
end;
$$;

create or replace function public.release_ai_music_seconds(p_work_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  res public.ai_music_reservations%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Yetkisiz';
  end if;

  select * into res
  from public.ai_music_reservations
  where work_id = p_work_id
  for update;

  if res.work_id is null or res.status <> 'reserved' then
    return;
  end if;

  update public.ai_music_balances
  set reserved_sec = greatest(0, reserved_sec - res.seconds),
      updated_at = now()
  where user_id = res.user_id;

  update public.ai_music_reservations
  set status = 'released'
  where work_id = p_work_id;
end;
$$;

create or replace function public.fulfill_ai_music_purchase(
  p_user_id uuid,
  p_session_id text,
  p_package_id text,
  p_amount_minor integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seconds integer;
  v_amount integer;
  inserted_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Yetkisiz';
  end if;
  if p_user_id is null or coalesce(p_session_id, '') = '' then
    raise exception 'Ödeme kaydı eksik';
  end if;

  if p_package_id = 'm15' then
    v_seconds := 900;
    v_amount := 15900;
  elsif p_package_id = 'm30' then
    v_seconds := 1800;
    v_amount := 34900;
  elsif p_package_id = 'm60' then
    v_seconds := 3600;
    v_amount := 99900;
  else
    raise exception 'Geçersiz paket';
  end if;

  if p_amount_minor is distinct from v_amount then
    raise exception 'Ödeme tutarı pakete uymuyor';
  end if;

  perform public.ensure_ai_music_balance(p_user_id);

  insert into public.ai_music_minute_ledger (
    user_id, seconds, source, package_id, amount_minor, currency, stripe_session_id
  )
  values (
    p_user_id, v_seconds, 'purchase', p_package_id, v_amount, 'try', p_session_id
  )
  on conflict (stripe_session_id) where stripe_session_id is not null do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    update public.ai_music_balances
    set granted_sec = granted_sec + v_seconds,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  return public.ai_music_balance_json(p_user_id);
end;
$$;

create or replace function public.admin_get_ai_music_balance(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row record;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;
  if p_user_id is null then
    raise exception 'Hesap gerekli';
  end if;

  perform public.ensure_ai_music_balance(p_user_id);

  select username, full_name into profile_row
  from public.profiles
  where id = p_user_id;
  if not found then
    raise exception 'Hesap bulunamadı';
  end if;

  return public.ai_music_balance_json(p_user_id) || jsonb_build_object(
    'user_id', p_user_id,
    'username', profile_row.username,
    'full_name', profile_row.full_name,
    'grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seconds', l.seconds,
        'source', l.source,
        'package_id', l.package_id,
        'amount_minor', l.amount_minor,
        'note', l.note,
        'created_at', l.created_at
      ) order by l.created_at desc)
      from (
        select *
        from public.ai_music_minute_ledger
        where user_id = p_user_id
        order by created_at desc
        limit 12
      ) l
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_grant_ai_music_minutes(
  p_user_id uuid,
  p_minutes integer,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seconds integer;
  v_note text := nullif(left(coalesce(p_note, ''), 200), '');
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;
  if p_user_id is null then
    raise exception 'Hesap gerekli';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 1440 then
    raise exception 'Dakika 1 ile 1440 arasında olmalı';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Hesap bulunamadı';
  end if;

  v_seconds := p_minutes * 60;
  perform public.ensure_ai_music_balance(p_user_id);

  insert into public.ai_music_minute_ledger (user_id, seconds, source, granted_by, note)
  values (p_user_id, v_seconds, 'admin', auth.uid(), v_note);

  update public.ai_music_balances
  set granted_sec = granted_sec + v_seconds,
      updated_at = now()
  where user_id = p_user_id;

  return public.admin_get_ai_music_balance(p_user_id);
end;
$$;

revoke all on function public.ensure_ai_music_balance(uuid) from public, anon, authenticated;
revoke all on function public.ai_music_balance_json(uuid) from public, anon, authenticated;
revoke all on function public.reserve_ai_music_seconds(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.settle_ai_music_seconds(uuid) from public, anon, authenticated;
revoke all on function public.release_ai_music_seconds(uuid) from public, anon, authenticated;
revoke all on function public.fulfill_ai_music_purchase(uuid, text, text, integer) from public, anon, authenticated;

grant execute on function public.ensure_ai_music_balance(uuid) to service_role;
grant execute on function public.ai_music_balance_json(uuid) to service_role;
grant execute on function public.reserve_ai_music_seconds(uuid, uuid, integer) to service_role;
grant execute on function public.settle_ai_music_seconds(uuid) to service_role;
grant execute on function public.release_ai_music_seconds(uuid) to service_role;
grant execute on function public.fulfill_ai_music_purchase(uuid, text, text, integer) to service_role;

grant execute on function public.get_ai_music_balance() to authenticated;
grant execute on function public.admin_get_ai_music_balance(uuid) to authenticated;
grant execute on function public.admin_grant_ai_music_minutes(uuid, integer, text) to authenticated;

grant select on public.ai_music_balances to authenticated;
grant select on public.ai_music_minute_ledger to authenticated;
grant select on public.ai_music_reservations to authenticated;
