-- VORADA Hakediş (Referans) — temel şema, ilişki, metrikler, otomatik durum hesaplama

create type public.referral_reward_kind as enum ('try', 'points', 'premium');

create type public.referral_commission_status as enum (
  'pending',
  'in_progress',
  'reviewing',
  'earned',
  'approved',
  'paid',
  'rejected',
  'cancelled'
);

create table public.referral_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reward_kind public.referral_reward_kind not null default 'try',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.referral_settings (
  campaign_id uuid primary key references public.referral_campaigns (id) on delete cascade,
  reward_amount_cents integer not null default 1000 check (reward_amount_cents >= 0),
  min_days integer not null default 15 check (min_days >= 0),
  min_active_minutes integer not null default 100 check (min_active_minutes >= 0),
  min_shares integer not null default 3 check (min_shares >= 0),
  min_interactions integer not null default 10 check (min_interactions >= 0),
  min_withdraw_cents integer not null default 5000 check (min_withdraw_cents >= 0),
  auto_approve boolean not null default false,
  suspicious_check boolean not null default true,
  require_account_active boolean not null default true,
  require_no_spam boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.referral_campaigns (id, name, reward_kind, is_active)
values ('00000000-0000-4000-8000-000000000001', 'VORADA Varsayılan', 'try', true)
on conflict (id) do nothing;

insert into public.referral_settings (campaign_id)
values ('00000000-0000-4000-8000-000000000001')
on conflict (campaign_id) do nothing;

create table public.referral_relationships (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null,
  campaign_id uuid not null references public.referral_campaigns (id),
  created_at timestamptz not null default now(),
  unique (invitee_id),
  constraint referral_relationships_no_self check (inviter_id <> invitee_id)
);

create index referral_relationships_inviter_idx
  on public.referral_relationships (inviter_id, created_at desc);

create table public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  relationship_id uuid not null unique references public.referral_relationships (id) on delete cascade,
  campaign_id uuid not null references public.referral_campaigns (id),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status public.referral_commission_status not null default 'pending',
  suspicious boolean not null default false,
  registered_at timestamptz not null default now(),
  earned_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitee_id)
);

create index referral_commissions_inviter_status_idx
  on public.referral_commissions (inviter_id, status, created_at desc);

create index referral_commissions_status_idx
  on public.referral_commissions (status, created_at desc);

create table public.referral_metrics (
  invitee_id uuid primary key references public.profiles (id) on delete cascade,
  relationship_id uuid not null unique references public.referral_relationships (id) on delete cascade,
  active_minutes integer not null default 0 check (active_minutes >= 0),
  shares_count integer not null default 0 check (shares_count >= 0),
  interactions_count integer not null default 0 check (interactions_count >= 0),
  first_login_at timestamptz,
  last_login_at timestamptz,
  violations_count integer not null default 0 check (violations_count >= 0),
  is_suspicious boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.referral_metric_events (
  id uuid primary key default gen_random_uuid(),
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('share', 'interaction', 'active_minute')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (invitee_id, idempotency_key)
);

create index referral_metric_events_invitee_idx
  on public.referral_metric_events (invitee_id, created_at desc);

-- ─── İlişki değişmezliği ─────────────────────────────────────────────────────

create or replace function public.referral_relationships_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Davet ilişkisi değiştirilemez';
end;
$$;

create trigger referral_relationships_no_update
  before update on public.referral_relationships
  for each row execute function public.referral_relationships_immutable();

create trigger referral_relationships_no_delete
  before delete on public.referral_relationships
  for each row execute function public.referral_relationships_immutable();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.referral_campaigns enable row level security;
alter table public.referral_settings enable row level security;
alter table public.referral_relationships enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.referral_metrics enable row level security;
alter table public.referral_metric_events enable row level security;

create policy referral_campaigns_read on public.referral_campaigns
  for select to authenticated using (true);

create policy referral_settings_read on public.referral_settings
  for select to authenticated using (true);

create policy referral_relationships_self_read on public.referral_relationships
  for select to authenticated
  using (auth.uid() in (inviter_id, invitee_id));

create policy referral_commissions_self_read on public.referral_commissions
  for select to authenticated
  using (auth.uid() in (inviter_id, invitee_id));

create policy referral_metrics_self_read on public.referral_metrics
  for select to authenticated
  using (auth.uid() = invitee_id or exists (
    select 1 from public.referral_relationships r
    where r.id = relationship_id and r.inviter_id = auth.uid()
  ));

-- ─── Yardımcılar ─────────────────────────────────────────────────────────────

create or replace function public.referral_get_active_campaign_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.referral_campaigns
  where is_active = true
  order by created_at asc
  limit 1;
$$;

create or replace function public.referral_get_active_settings()
returns public.referral_settings
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_settings public.referral_settings%rowtype;
begin
  v_campaign_id := public.referral_get_active_campaign_id();
  if v_campaign_id is null then
    raise exception 'Aktif hakediş kampanyası bulunamadı';
  end if;

  select * into v_settings
  from public.referral_settings
  where campaign_id = v_campaign_id;

  return v_settings;
end;
$$;

create or replace function public.referral_is_user_blacklisted(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if to_regclass('public.referral_blacklist') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.referral_blacklist b
    where b.user_id = p_user_id
  );
end;
$$;

create or replace function public.referral_evaluate_invitee(
  p_invitee_id uuid,
  p_settings public.referral_settings
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_metrics public.referral_metrics%rowtype;
  v_profile public.profiles%rowtype;
  v_days_met boolean;
  v_minutes_met boolean;
  v_shares_met boolean;
  v_interactions_met boolean;
  v_account_ok boolean := true;
  v_spam_ok boolean := true;
  v_suspicious boolean := false;
  v_membership_days numeric;
begin
  select * into v_metrics
  from public.referral_metrics
  where invitee_id = p_invitee_id;

  if not found then
    return jsonb_build_object('eligible', false, 'reason', 'metrics_missing');
  end if;

  select * into v_profile
  from public.profiles
  where id = p_invitee_id;

  v_membership_days := extract(epoch from (now() - coalesce(v_profile.created_at, now()))) / 86400.0;

  v_days_met := v_membership_days >= p_settings.min_days;
  v_minutes_met := v_metrics.active_minutes >= p_settings.min_active_minutes;
  v_shares_met := v_metrics.shares_count >= p_settings.min_shares;
  v_interactions_met := v_metrics.interactions_count >= p_settings.min_interactions;

  if p_settings.require_account_active then
    v_account_ok := coalesce(v_profile.account_status, 'active') = 'active';
  end if;

  if p_settings.require_no_spam then
    v_spam_ok := not (
      coalesce(v_profile.trust_penalty_until, now() - interval '1 second') > now()
      or v_metrics.violations_count > 0
    );
  end if;

  if p_settings.suspicious_check then
    v_suspicious := v_metrics.is_suspicious
      or (to_regclass('public.referral_blacklist') is not null and public.referral_is_user_blacklisted(p_invitee_id));
  end if;

  return jsonb_build_object(
    'eligible', v_days_met and v_minutes_met and v_shares_met and v_interactions_met and v_account_ok and v_spam_ok and not v_suspicious,
    'suspicious', v_suspicious,
    'days_met', v_days_met,
    'minutes_met', v_minutes_met,
    'shares_met', v_shares_met,
    'interactions_met', v_interactions_met,
    'account_ok', v_account_ok,
    'spam_ok', v_spam_ok,
    'membership_days', floor(v_membership_days),
    'active_minutes', v_metrics.active_minutes,
    'shares_count', v_metrics.shares_count,
    'interactions_count', v_metrics.interactions_count,
    'progress_count', (
      (case when v_days_met then 1 else 0 end) +
      (case when v_minutes_met then 1 else 0 end) +
      (case when v_shares_met then 1 else 0 end) +
      (case when v_interactions_met then 1 else 0 end)
    )
  );
end;
$$;

create or replace function public.referral_recompute_commission(p_commission_id uuid)
returns public.referral_commission_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
  v_settings public.referral_settings%rowtype;
  v_eval jsonb;
  v_new_status public.referral_commission_status;
  v_has_progress boolean;
begin
  select * into v_commission
  from public.referral_commissions
  where id = p_commission_id
  for update;

  if not found then
    return null;
  end if;

  if v_commission.status in ('approved', 'paid', 'rejected', 'cancelled') then
    return v_commission.status;
  end if;

  select * into v_settings
  from public.referral_settings
  where campaign_id = v_commission.campaign_id;

  v_eval := public.referral_evaluate_invitee(v_commission.invitee_id, v_settings);
  v_has_progress := coalesce((v_eval->>'progress_count')::int, 0) > 0;

  if coalesce((v_eval->>'suspicious')::boolean, false) then
    v_new_status := 'reviewing';
  elsif coalesce((v_eval->>'eligible')::boolean, false) then
    v_new_status := 'earned';
  elsif v_has_progress then
    v_new_status := 'in_progress';
  else
    v_new_status := 'pending';
  end if;

  update public.referral_commissions
  set
    status = v_new_status,
    suspicious = coalesce((v_eval->>'suspicious')::boolean, false),
    amount_cents = case when amount_cents = 0 then v_settings.reward_amount_cents else amount_cents end,
    earned_at = case
      when v_new_status = 'earned' and earned_at is null then now()
      else earned_at
    end,
    updated_at = now()
  where id = p_commission_id;

  return v_new_status;
end;
$$;

create or replace function public.referral_recompute_for_invitee(p_invitee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission_id uuid;
begin
  select id into v_commission_id
  from public.referral_commissions
  where invitee_id = p_invitee_id;

  if v_commission_id is not null then
    perform public.referral_recompute_commission(v_commission_id);
  end if;
end;
$$;

-- ─── Davet ilişkisi kur ────────────────────────────────────────────────────────

create or replace function public.referral_establish_relationship(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text;
  v_inviter_id uuid;
  v_campaign_id uuid;
  v_settings public.referral_settings%rowtype;
  v_relationship_id uuid;
  v_commission_id uuid;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  v_normalized := public.normalize_friend_invite_code(p_code);

  if char_length(v_normalized) < 6 then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz davet kodu');
  end if;

  if exists (select 1 from public.referral_relationships where invitee_id = v_user_id) then
    return jsonb_build_object('ok', false, 'error', 'Zaten bir davet ilişkiniz var');
  end if;

  select id into v_inviter_id
  from public.profiles
  where invite_code = v_normalized;

  if v_inviter_id is null then
    return jsonb_build_object('ok', false, 'error', 'Davet kodu bulunamadı');
  end if;

  if v_inviter_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'Kendi davet kodunuzu kullanamazsınız');
  end if;

  if to_regclass('public.referral_blacklist') is not null then
    if public.referral_is_user_blacklisted(v_inviter_id) or public.referral_is_user_blacklisted(v_user_id) then
      return jsonb_build_object('ok', false, 'error', 'Davet işlemi engellendi');
    end if;
  end if;

  v_campaign_id := public.referral_get_active_campaign_id();
  if v_campaign_id is null then
    return jsonb_build_object('ok', false, 'error', 'Hakediş kampanyası aktif değil');
  end if;

  select * into v_settings from public.referral_settings where campaign_id = v_campaign_id;

  insert into public.referral_relationships (inviter_id, invitee_id, invite_code, campaign_id)
  values (v_inviter_id, v_user_id, v_normalized, v_campaign_id)
  returning id into v_relationship_id;

  insert into public.referral_commissions (
    inviter_id, invitee_id, relationship_id, campaign_id, amount_cents, status, registered_at
  )
  values (
    v_inviter_id, v_user_id, v_relationship_id, v_campaign_id, v_settings.reward_amount_cents, 'pending', now()
  )
  returning id into v_commission_id;

  insert into public.referral_metrics (invitee_id, relationship_id, first_login_at, last_login_at)
  values (v_user_id, v_relationship_id, now(), now());

  perform public.referral_recompute_commission(v_commission_id);

  return jsonb_build_object(
    'ok', true,
    'relationship_id', v_relationship_id,
    'commission_id', v_commission_id
  );
end;
$$;

-- ─── Sayaç takibi ────────────────────────────────────────────────────────────

create or replace function public.referral_track_event(p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_relationship_id uuid;
  v_idempotency text;
  v_bucket timestamptz;
  v_event_id uuid;
begin
  if v_user_id is null then
    return;
  end if;

  if p_event_type not in ('share', 'interaction', 'active_minute') then
    return;
  end if;

  select relationship_id into v_relationship_id
  from public.referral_metrics
  where invitee_id = v_user_id;

  if v_relationship_id is null then
    return;
  end if;

  if p_event_type = 'active_minute' then
    v_bucket := date_trunc('minute', now());
    v_idempotency := 'active_minute:' || to_char(v_bucket, 'YYYYMMDDHH24MI');
  else
    v_idempotency := p_event_type || ':' || gen_random_uuid()::text;
  end if;

  insert into public.referral_metric_events (invitee_id, event_type, idempotency_key)
  values (v_user_id, p_event_type, v_idempotency)
  on conflict (invitee_id, idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return;
  end if;

  if p_event_type = 'share' then
    update public.referral_metrics
    set shares_count = shares_count + 1, last_login_at = now(), updated_at = now()
    where invitee_id = v_user_id;
  elsif p_event_type = 'interaction' then
    update public.referral_metrics
    set interactions_count = interactions_count + 1, last_login_at = now(), updated_at = now()
    where invitee_id = v_user_id;
  elsif p_event_type = 'active_minute' then
    update public.referral_metrics
    set
      active_minutes = active_minutes + 1,
      last_login_at = now(),
      first_login_at = coalesce(first_login_at, now()),
      updated_at = now()
    where invitee_id = v_user_id;
  end if;

  perform public.referral_recompute_for_invitee(v_user_id);
end;
$$;

-- ─── Kullanıcı özet RPC ──────────────────────────────────────────────────────

create or replace function public.referral_user_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite_code text;
  v_settings public.referral_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  select invite_code into v_invite_code from public.profiles where id = v_user_id;
  v_settings := public.referral_get_active_settings();

  return jsonb_build_object(
    'invite_code', v_invite_code,
    'reward_amount_cents', v_settings.reward_amount_cents,
    'min_days', v_settings.min_days,
    'min_active_minutes', v_settings.min_active_minutes,
    'min_shares', v_settings.min_shares,
    'min_interactions', v_settings.min_interactions,
    'total_invites', (
      select count(*)::int from public.referral_relationships where inviter_id = v_user_id
    ),
    'pending_count', (
      select count(*)::int from public.referral_commissions
      where inviter_id = v_user_id and status in ('pending', 'in_progress', 'reviewing')
    ),
    'earned_count', (
      select count(*)::int from public.referral_commissions
      where inviter_id = v_user_id and status = 'earned'
    ),
    'approved_count', (
      select count(*)::int from public.referral_commissions
      where inviter_id = v_user_id and status = 'approved'
    ),
    'paid_count', (
      select count(*)::int from public.referral_commissions
      where inviter_id = v_user_id and status = 'paid'
    ),
    'rejected_count', (
      select count(*)::int from public.referral_commissions
      where inviter_id = v_user_id and status in ('rejected', 'cancelled')
    ),
    'total_earned_cents', (
      select coalesce(sum(amount_cents), 0)::int from public.referral_commissions
      where inviter_id = v_user_id and status in ('earned', 'approved', 'paid')
    ),
    'total_paid_cents', (
      select coalesce(sum(amount_cents), 0)::int from public.referral_commissions
      where inviter_id = v_user_id and status = 'paid'
    ),
    'pending_earnings_cents', (
      select coalesce(sum(amount_cents), 0)::int from public.referral_commissions
      where inviter_id = v_user_id and status in ('pending', 'in_progress', 'reviewing', 'earned')
    ),
    'approved_earnings_cents', (
      select coalesce(sum(amount_cents), 0)::int from public.referral_commissions
      where inviter_id = v_user_id and status = 'approved'
    ),
    'has_relationship_as_invitee', exists (
      select 1 from public.referral_relationships where invitee_id = v_user_id
    )
  );
end;
$$;

create or replace function public.referral_list_invitees()
returns table (
  commission_id uuid,
  invitee_id uuid,
  username text,
  full_name text,
  avatar_url text,
  registered_at timestamptz,
  status public.referral_commission_status,
  amount_cents integer,
  membership_days integer,
  active_minutes integer,
  shares_count integer,
  interactions_count integer,
  min_days integer,
  min_active_minutes integer,
  min_shares integer,
  min_interactions integer,
  progress_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.referral_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  v_settings := public.referral_get_active_settings();

  return query
  select
    c.id,
    c.invitee_id,
    p.username,
    p.full_name,
    p.avatar_url,
    c.registered_at,
    c.status,
    c.amount_cents,
    floor(extract(epoch from (now() - p.created_at)) / 86400.0)::int,
    m.active_minutes,
    m.shares_count,
    m.interactions_count,
    v_settings.min_days,
    v_settings.min_active_minutes,
    v_settings.min_shares,
    v_settings.min_interactions,
    least(100, greatest(0, (
      (least(100, (floor(extract(epoch from (now() - p.created_at)) / 86400.0) / nullif(v_settings.min_days, 0)) * 100))::int +
      (least(100, (m.active_minutes::numeric / nullif(v_settings.min_active_minutes, 0)) * 100))::int +
      (least(100, (m.shares_count::numeric / nullif(v_settings.min_shares, 0)) * 100))::int +
      (least(100, (m.interactions_count::numeric / nullif(v_settings.min_interactions, 0)) * 100))::int
    ) / 4))::int
  from public.referral_commissions c
  join public.profiles p on p.id = c.invitee_id
  join public.referral_metrics m on m.invitee_id = c.invitee_id
  where c.inviter_id = v_user_id
  order by c.registered_at desc;
end;
$$;

create or replace function public.referral_invitee_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rel public.referral_relationships%rowtype;
  v_settings public.referral_settings%rowtype;
  v_eval jsonb;
  v_inviter_username text;
  v_inviter_full_name text;
  v_inviter_avatar text;
  v_commission public.referral_commissions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  select * into v_rel
  from public.referral_relationships
  where invitee_id = v_user_id;

  if not found then
    return jsonb_build_object('has_inviter', false);
  end if;

  select username, full_name, avatar_url
  into v_inviter_username, v_inviter_full_name, v_inviter_avatar
  from public.profiles
  where id = v_rel.inviter_id;

  v_settings := public.referral_get_active_settings();
  v_eval := public.referral_evaluate_invitee(v_user_id, v_settings);

  select * into v_commission
  from public.referral_commissions
  where invitee_id = v_user_id;

  return jsonb_build_object(
    'has_inviter', true,
    'inviter_id', v_rel.inviter_id,
    'inviter_username', v_inviter_username,
    'inviter_full_name', v_inviter_full_name,
    'inviter_avatar', v_inviter_avatar,
    'invite_code', v_rel.invite_code,
    'registered_at', v_rel.created_at,
    'commission_status', v_commission.status,
    'settings', jsonb_build_object(
      'min_days', v_settings.min_days,
      'min_active_minutes', v_settings.min_active_minutes,
      'min_shares', v_settings.min_shares,
      'min_interactions', v_settings.min_interactions
    ),
    'evaluation', v_eval,
    'progress_percent', least(100, greatest(0, (
      (least(100, (coalesce((v_eval->>'membership_days')::numeric, 0) / nullif(v_settings.min_days, 0)) * 100))::int +
      (least(100, (coalesce((v_eval->>'active_minutes')::numeric, 0) / nullif(v_settings.min_active_minutes, 0)) * 100))::int +
      (least(100, (coalesce((v_eval->>'shares_count')::numeric, 0) / nullif(v_settings.min_shares, 0)) * 100))::int +
      (least(100, (coalesce((v_eval->>'interactions_count')::numeric, 0) / nullif(v_settings.min_interactions, 0)) * 100))::int
    ) / 4))
  );
end;
$$;

grant execute on function public.referral_establish_relationship(text) to authenticated;
grant execute on function public.referral_track_event(text) to authenticated;
grant execute on function public.referral_user_summary() to authenticated;
grant execute on function public.referral_list_invitees() to authenticated;
grant execute on function public.referral_invitee_progress() to authenticated;
