-- VORADA Hakediş — admin işlemleri, log, finans, platform yükümlülüğü

create table public.referral_commission_logs (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.referral_commissions (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  old_status public.referral_commission_status,
  new_status public.referral_commission_status,
  ip text,
  note text,
  created_at timestamptz not null default now()
);

create index referral_commission_logs_commission_idx
  on public.referral_commission_logs (commission_id, created_at desc);

alter table public.referral_commission_logs enable row level security;

create table public.referral_blacklist (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reason text,
  blacklisted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.referral_blacklist enable row level security;

create table public.referral_platform_liability_ledger (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid references public.referral_commissions (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  entry_type text not null check (entry_type in (
    'commission_approved', 'commission_paid', 'manual_grant', 'manual_remove', 'payout'
  )),
  note text,
  created_at timestamptz not null default now()
);

create index referral_platform_liability_user_idx
  on public.referral_platform_liability_ledger (user_id, created_at desc);

create index referral_platform_liability_commission_idx
  on public.referral_platform_liability_ledger (commission_id)
  where commission_id is not null;

alter table public.referral_platform_liability_ledger enable row level security;

create policy referral_platform_liability_self_read on public.referral_platform_liability_ledger
  for select to authenticated
  using (user_id = auth.uid());

create table public.referral_payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'rejected')),
  note text,
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index referral_payout_requests_user_idx
  on public.referral_payout_requests (user_id, created_at desc);

alter table public.referral_payout_requests enable row level security;

create policy referral_payout_requests_self_read on public.referral_payout_requests
  for select to authenticated
  using (user_id = auth.uid());

-- ─── Log yardımcısı ──────────────────────────────────────────────────────────

create or replace function public.referral_log_commission_action(
  p_commission_id uuid,
  p_action text,
  p_old_status public.referral_commission_status,
  p_new_status public.referral_commission_status,
  p_note text default null,
  p_ip text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.referral_commission_logs (
    commission_id, actor_id, action, old_status, new_status, ip, note
  )
  values (
    p_commission_id, auth.uid(), p_action, p_old_status, p_new_status, p_ip, p_note
  );
end;
$$;

create or replace function public.referral_transition_commission(
  p_commission_id uuid,
  p_new_status public.referral_commission_status,
  p_action text,
  p_note text default null,
  p_ip text default null,
  p_amount_cents integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
begin
  select * into v_commission
  from public.referral_commissions
  where id = p_commission_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Hakediş bulunamadı');
  end if;

  if v_commission.status = p_new_status then
    return jsonb_build_object('ok', true, 'status', p_new_status);
  end if;

  update public.referral_commissions
  set
    status = p_new_status,
    amount_cents = coalesce(p_amount_cents, amount_cents),
    earned_at = case when p_new_status = 'earned' and earned_at is null then now() else earned_at end,
    approved_at = case when p_new_status = 'approved' and approved_at is null then now() else approved_at end,
    paid_at = case when p_new_status = 'paid' and paid_at is null then now() else paid_at end,
    note = coalesce(p_note, note),
    updated_at = now()
  where id = p_commission_id;

  if p_new_status = 'approved' then
    insert into public.referral_platform_liability_ledger (
      commission_id, user_id, amount_cents, entry_type, note
    )
    values (
      p_commission_id,
      v_commission.inviter_id,
      coalesce(p_amount_cents, v_commission.amount_cents),
      'commission_approved',
      coalesce(p_note, 'Hakediş onaylandı')
    );
  end if;

  if p_new_status = 'paid' then
    insert into public.referral_platform_liability_ledger (
      commission_id, user_id, amount_cents, entry_type, note
    )
    values (
      p_commission_id,
      v_commission.inviter_id,
      coalesce(p_amount_cents, v_commission.amount_cents),
      'commission_paid',
      coalesce(p_note, 'Hakediş ödendi')
    );
  end if;

  perform public.referral_log_commission_action(
    p_commission_id, p_action, v_commission.status, p_new_status, p_note, p_ip
  );

  return jsonb_build_object('ok', true, 'status', p_new_status);
end;
$$;

-- ─── Admin işlemleri ─────────────────────────────────────────────────────────

create or replace function public.referral_admin_approve(
  p_commission_id uuid,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_commission
  from public.referral_commissions
  where id = p_commission_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Hakediş bulunamadı');
  end if;

  if v_commission.status not in ('earned', 'reviewing', 'in_progress') then
    return jsonb_build_object('ok', false, 'error', 'Bu durumda onaylanamaz');
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'approved', 'approve', p_note, p_ip
  );
end;
$$;

create or replace function public.referral_admin_reject(
  p_commission_id uuid,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'rejected', 'reject', p_note, p_ip
  );
end;
$$;

create or replace function public.referral_admin_review(
  p_commission_id uuid,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'reviewing', 'review', p_note, p_ip
  );
end;
$$;

create or replace function public.referral_admin_cancel(
  p_commission_id uuid,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'cancelled', 'cancel', p_note, p_ip
  );
end;
$$;

create or replace function public.referral_admin_manual_grant(
  p_commission_id uuid,
  p_amount_cents integer,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz tutar');
  end if;

  select * into v_commission from public.referral_commissions where id = p_commission_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Hakediş bulunamadı');
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'approved', 'manual_grant', p_note, p_ip, p_amount_cents
  );
end;
$$;

create or replace function public.referral_admin_manual_remove(
  p_commission_id uuid,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_commission from public.referral_commissions where id = p_commission_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Hakediş bulunamadı');
  end if;

  if v_commission.status = 'approved' then
    insert into public.referral_platform_liability_ledger (
      commission_id, user_id, amount_cents, entry_type, note
    )
    values (
      p_commission_id,
      v_commission.inviter_id,
      v_commission.amount_cents,
      'manual_remove',
      coalesce(p_note, 'Elle hakediş silindi')
    );
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'cancelled', 'manual_remove', p_note, p_ip, 0
  );
end;
$$;

create or replace function public.referral_admin_add_note(
  p_commission_id uuid,
  p_note text,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_commission from public.referral_commissions where id = p_commission_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Hakediş bulunamadı');
  end if;

  update public.referral_commissions
  set note = p_note, updated_at = now()
  where id = p_commission_id;

  perform public.referral_log_commission_action(
    p_commission_id, 'add_note', v_commission.status, v_commission.status, p_note, p_ip
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.referral_admin_blacklist_user(
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  insert into public.referral_blacklist (user_id, reason, blacklisted_by)
  values (p_user_id, p_reason, auth.uid())
  on conflict (user_id) do update
  set reason = excluded.reason, blacklisted_by = excluded.blacklisted_by;

  update public.referral_metrics
  set is_suspicious = true, updated_at = now()
  where invitee_id = p_user_id
     or relationship_id in (
       select id from public.referral_relationships where inviter_id = p_user_id
     );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.referral_admin_mark_paid(
  p_commission_id uuid,
  p_note text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return public.referral_transition_commission(
    p_commission_id, 'paid', 'mark_paid', p_note, p_ip
  );
end;
$$;

-- Otomatik onay desteği ile recompute güncelle
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

  if v_new_status = 'earned' and v_settings.auto_approve then
    perform public.referral_transition_commission(
      p_commission_id, 'approved', 'auto_approve', 'Otomatik onay', null
    );
  end if;

  return v_new_status;
end;
$$;

-- ─── Kullanıcı cüzdan özeti ───────────────────────────────────────────────────

create or replace function public.referral_wallet_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.referral_settings%rowtype;
  v_approved_cents int;
  v_pending_payout_cents int;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  v_settings := public.referral_get_active_settings();

  select coalesce(sum(amount_cents), 0)::int into v_approved_cents
  from public.referral_commissions
  where inviter_id = v_user_id and status = 'approved';

  select coalesce(sum(amount_cents), 0)::int into v_pending_payout_cents
  from public.referral_payout_requests
  where user_id = v_user_id and status in ('pending', 'processing');

  return jsonb_build_object(
    'pending_earnings_cents', (
      select coalesce(sum(amount_cents), 0)::int from public.referral_commissions
      where inviter_id = v_user_id and status in ('pending', 'in_progress', 'reviewing', 'earned')
    ),
    'approved_earnings_cents', v_approved_cents,
    'withdrawable_cents', greatest(0, v_approved_cents - v_pending_payout_cents),
    'paid_cents', (
      select coalesce(sum(amount_cents), 0)::int from public.referral_commissions
      where inviter_id = v_user_id and status = 'paid'
    ),
    'min_withdraw_cents', v_settings.min_withdraw_cents
  );
end;
$$;

create or replace function public.referral_request_payout(p_amount_cents integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.referral_settings%rowtype;
  v_wallet jsonb;
  v_withdrawable int;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  v_settings := public.referral_get_active_settings();
  v_wallet := public.referral_wallet_summary();
  v_withdrawable := coalesce((v_wallet->>'withdrawable_cents')::int, 0);

  if p_amount_cents < v_settings.min_withdraw_cents then
    return jsonb_build_object('ok', false, 'error', 'Minimum çekim tutarının altında');
  end if;

  if p_amount_cents > v_withdrawable then
    return jsonb_build_object('ok', false, 'error', 'Yetersiz ödenebilir bakiye');
  end if;

  insert into public.referral_payout_requests (user_id, amount_cents)
  values (v_user_id, p_amount_cents);

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── Admin istatistik ────────────────────────────────────────────────────────

create or replace function public.referral_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return jsonb_build_object(
    'total_invites', (select count(*)::int from public.referral_relationships),
    'total_commissions', (select count(*)::int from public.referral_commissions),
    'pending_count', (
      select count(*)::int from public.referral_commissions
      where status in ('pending', 'in_progress')
    ),
    'reviewing_count', (
      select count(*)::int from public.referral_commissions where status = 'reviewing'
    ),
    'earned_count', (
      select count(*)::int from public.referral_commissions where status = 'earned'
    ),
    'approved_count', (
      select count(*)::int from public.referral_commissions where status = 'approved'
    ),
    'paid_count', (
      select count(*)::int from public.referral_commissions where status = 'paid'
    ),
    'cancelled_count', (
      select count(*)::int from public.referral_commissions where status = 'cancelled'
    ),
    'rejected_count', (
      select count(*)::int from public.referral_commissions where status = 'rejected'
    ),
    'suspicious_count', (
      select count(*)::int from public.referral_commissions where suspicious = true
    ),
    'total_liability_cents', (
      select coalesce(sum(amount_cents), 0)::int
      from public.referral_platform_liability_ledger
      where entry_type = 'commission_approved'
    ),
    'total_paid_cents', (
      select coalesce(sum(amount_cents), 0)::int
      from public.referral_platform_liability_ledger
      where entry_type = 'commission_paid'
    )
  );
end;
$$;

create or replace function public.referral_admin_list(p_status text default null, p_limit integer default 100)
returns table (
  commission_id uuid,
  inviter_id uuid,
  inviter_username text,
  invitee_id uuid,
  invitee_username text,
  amount_cents integer,
  status public.referral_commission_status,
  suspicious boolean,
  registered_at timestamptz,
  earned_at timestamptz,
  paid_at timestamptz,
  invite_code text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    c.id,
    c.inviter_id,
    pi.username,
    c.invitee_id,
    pe.username,
    c.amount_cents,
    c.status,
    c.suspicious,
    c.registered_at,
    c.earned_at,
    c.paid_at,
    r.invite_code
  from public.referral_commissions c
  join public.referral_relationships r on r.id = c.relationship_id
  join public.profiles pi on pi.id = c.inviter_id
  join public.profiles pe on pe.id = c.invitee_id
  where p_status is null or c.status::text = p_status
  order by c.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.referral_admin_detail(p_commission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_commission public.referral_commissions%rowtype;
  v_rel public.referral_relationships%rowtype;
  v_metrics public.referral_metrics%rowtype;
  v_inviter public.profiles%rowtype;
  v_invitee public.profiles%rowtype;
  v_settings public.referral_settings%rowtype;
  v_eval jsonb;
  v_logs jsonb;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_commission from public.referral_commissions where id = p_commission_id;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_rel from public.referral_relationships where id = v_commission.relationship_id;
  select * into v_metrics from public.referral_metrics where invitee_id = v_commission.invitee_id;
  select * into v_inviter from public.profiles where id = v_commission.inviter_id;
  select * into v_invitee from public.profiles where id = v_commission.invitee_id;
  select * into v_settings from public.referral_settings where campaign_id = v_commission.campaign_id;
  v_eval := public.referral_evaluate_invitee(v_commission.invitee_id, v_settings);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'actor_id', l.actor_id,
      'action', l.action,
      'old_status', l.old_status,
      'new_status', l.new_status,
      'ip', l.ip,
      'note', l.note,
      'created_at', l.created_at
    ) order by l.created_at desc
  ), '[]'::jsonb) into v_logs
  from public.referral_commission_logs l
  where l.commission_id = p_commission_id;

  return jsonb_build_object(
    'ok', true,
    'commission', jsonb_build_object(
      'id', v_commission.id,
      'status', v_commission.status,
      'amount_cents', v_commission.amount_cents,
      'suspicious', v_commission.suspicious,
      'registered_at', v_commission.registered_at,
      'earned_at', v_commission.earned_at,
      'approved_at', v_commission.approved_at,
      'paid_at', v_commission.paid_at,
      'note', v_commission.note
    ),
    'inviter', jsonb_build_object(
      'id', v_inviter.id,
      'username', v_inviter.username,
      'full_name', v_inviter.full_name,
      'avatar_url', v_inviter.avatar_url
    ),
    'invitee', jsonb_build_object(
      'id', v_invitee.id,
      'username', v_invitee.username,
      'full_name', v_invitee.full_name,
      'avatar_url', v_invitee.avatar_url,
      'account_status', v_invitee.account_status,
      'created_at', v_invitee.created_at,
      'last_seen_at', v_invitee.last_seen_at,
      'last_active_at', v_invitee.last_active_at
    ),
    'invite_code', v_rel.invite_code,
    'metrics', jsonb_build_object(
      'active_minutes', v_metrics.active_minutes,
      'shares_count', v_metrics.shares_count,
      'interactions_count', v_metrics.interactions_count,
      'first_login_at', v_metrics.first_login_at,
      'last_login_at', v_metrics.last_login_at,
      'violations_count', v_metrics.violations_count,
      'is_suspicious', v_metrics.is_suspicious
    ),
    'evaluation', v_eval,
    'logs', v_logs
  );
end;
$$;

create or replace function public.referral_finance_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_not_earned_cents int;
  v_earned_cents int;
  v_approved_cents int;
  v_paid_cents int;
  v_cancelled_cents int;
  v_rejected_cents int;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select coalesce(sum(amount_cents), 0)::int into v_not_earned_cents
  from public.referral_commissions
  where status in ('pending', 'in_progress', 'reviewing');

  select coalesce(sum(amount_cents), 0)::int into v_earned_cents
  from public.referral_commissions where status = 'earned';

  select coalesce(sum(amount_cents), 0)::int into v_approved_cents
  from public.referral_commissions where status = 'approved';

  select coalesce(sum(amount_cents), 0)::int into v_paid_cents
  from public.referral_commissions where status = 'paid';

  select coalesce(sum(amount_cents), 0)::int into v_cancelled_cents
  from public.referral_commissions where status = 'cancelled';

  select coalesce(sum(amount_cents), 0)::int into v_rejected_cents
  from public.referral_commissions where status = 'rejected';

  return jsonb_build_object(
    'not_earned_cents', v_not_earned_cents,
    'earned_cents', v_earned_cents,
    'approved_cents', v_approved_cents,
    'paid_cents', v_paid_cents,
    'cancelled_cents', v_cancelled_cents,
    'rejected_cents', v_rejected_cents,
    'total_liability_cents', v_approved_cents + v_earned_cents,
    'total_paid_cents', v_paid_cents,
    'total_pending_cents', v_approved_cents
  );
end;
$$;

create or replace function public.referral_admin_get_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_campaign public.referral_campaigns%rowtype;
  v_settings public.referral_settings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_campaign
  from public.referral_campaigns
  where is_active = true
  order by created_at asc
  limit 1;

  select * into v_settings from public.referral_settings where campaign_id = v_campaign.id;

  return jsonb_build_object(
    'campaign_id', v_campaign.id,
    'campaign_name', v_campaign.name,
    'reward_kind', v_campaign.reward_kind,
    'reward_amount_cents', v_settings.reward_amount_cents,
    'min_days', v_settings.min_days,
    'min_active_minutes', v_settings.min_active_minutes,
    'min_shares', v_settings.min_shares,
    'min_interactions', v_settings.min_interactions,
    'min_withdraw_cents', v_settings.min_withdraw_cents,
    'auto_approve', v_settings.auto_approve,
    'suspicious_check', v_settings.suspicious_check,
    'require_account_active', v_settings.require_account_active,
    'require_no_spam', v_settings.require_no_spam
  );
end;
$$;

create or replace function public.referral_admin_update_settings(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  v_campaign_id := (p_payload->>'campaign_id')::uuid;
  if v_campaign_id is null then
    v_campaign_id := public.referral_get_active_campaign_id();
  end if;

  update public.referral_settings
  set
    reward_amount_cents = coalesce((p_payload->>'reward_amount_cents')::int, reward_amount_cents),
    min_days = coalesce((p_payload->>'min_days')::int, min_days),
    min_active_minutes = coalesce((p_payload->>'min_active_minutes')::int, min_active_minutes),
    min_shares = coalesce((p_payload->>'min_shares')::int, min_shares),
    min_interactions = coalesce((p_payload->>'min_interactions')::int, min_interactions),
    min_withdraw_cents = coalesce((p_payload->>'min_withdraw_cents')::int, min_withdraw_cents),
    auto_approve = coalesce((p_payload->>'auto_approve')::boolean, auto_approve),
    suspicious_check = coalesce((p_payload->>'suspicious_check')::boolean, suspicious_check),
    require_account_active = coalesce((p_payload->>'require_account_active')::boolean, require_account_active),
    require_no_spam = coalesce((p_payload->>'require_no_spam')::boolean, require_no_spam),
    updated_at = now()
  where campaign_id = v_campaign_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.referral_admin_approve(uuid, text, text) to authenticated;
grant execute on function public.referral_admin_reject(uuid, text, text) to authenticated;
grant execute on function public.referral_admin_review(uuid, text, text) to authenticated;
grant execute on function public.referral_admin_cancel(uuid, text, text) to authenticated;
grant execute on function public.referral_admin_manual_grant(uuid, integer, text, text) to authenticated;
grant execute on function public.referral_admin_manual_remove(uuid, text, text) to authenticated;
grant execute on function public.referral_admin_add_note(uuid, text, text) to authenticated;
grant execute on function public.referral_admin_blacklist_user(uuid, text) to authenticated;
grant execute on function public.referral_admin_mark_paid(uuid, text, text) to authenticated;
grant execute on function public.referral_wallet_summary() to authenticated;
grant execute on function public.referral_request_payout(integer) to authenticated;
grant execute on function public.referral_admin_dashboard() to authenticated;
grant execute on function public.referral_admin_list(text, integer) to authenticated;
grant execute on function public.referral_admin_detail(uuid) to authenticated;
grant execute on function public.referral_finance_summary() to authenticated;
grant execute on function public.referral_admin_get_settings() to authenticated;
grant execute on function public.referral_admin_update_settings(jsonb) to authenticated;
