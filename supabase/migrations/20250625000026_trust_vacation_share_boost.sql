-- Kimlik + tatil kartı paylaşım puanları; tavanlar hafif gevşetildi (süre kısalsın)

create type public.vacation_card_type as enum ('uzungol', 'rize');

create type public.vacation_card_share_status as enum ('pending', 'approved', 'rejected');

create table public.vacation_card_share_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_type public.vacation_card_type not null,
  platform text not null check (char_length(trim(platform)) between 2 and 40),
  post_url text not null check (char_length(trim(post_url)) between 8 and 500),
  status public.vacation_card_share_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, card_type)
);

create index vacation_card_share_submissions_status_idx
  on public.vacation_card_share_submissions (status, created_at desc);

-- Günlük/haftalık/aylık tavan (biraz yükseltildi)
create or replace function public.trust_positive_cap_remaining(
  p_user_id uuid,
  p_window text
)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_earned int;
  v_cap int;
  v_since timestamptz;
begin
  v_cap := case p_window
    when 'day' then 3
    when 'week' then 10
    when 'month' then 25
    else 0
  end;

  v_since := case p_window
    when 'day' then date_trunc('day', now())
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else now()
  end;

  select coalesce(sum(applied_delta), 0) into v_earned
  from public.trust_score_ledger
  where user_id = p_user_id
    and applied_delta > 0
    and created_at >= v_since;

  return greatest(0, v_cap - v_earned);
end;
$$;

create or replace function public.apply_trust_delta(
  p_user_id uuid,
  p_base_delta int,
  p_source_type text,
  p_source_id text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed_positive text[] := array[
    'incident_verified',
    'news_verify_correct',
    'comment_quality',
    'event_success',
    'identity_verified',
    'vacation_card_share_verified',
    'first_verified_content',
    'clean_streak_30d',
    'clean_streak_90d'
  ];
  v_allowed_negative text[] := array[
    'news_verify_incorrect',
    'report_penalty',
    'moderation_penalty',
    'admin_adjust'
  ];
  v_old_score int;
  v_new_score int;
  v_working_delta int;
  v_applied_delta int;
  v_idempotency text;
  v_day_left int;
  v_week_left int;
  v_month_left int;
  v_month_incidents int;
  v_today_news int;
begin
  if p_user_id is null or p_base_delta = 0 then
    return;
  end if;

  if p_base_delta > 0 and not (p_source_type = any (v_allowed_positive)) then
    return;
  end if;

  if p_base_delta < 0 and not (p_source_type = any (v_allowed_negative)) then
    return;
  end if;

  v_idempotency := p_source_type || ':' || coalesce(p_source_id, p_user_id::text);

  if exists (select 1 from public.trust_score_ledger where idempotency_key = v_idempotency) then
    return;
  end if;

  select trust_score into v_old_score
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if p_base_delta > 0 then
    if exists (
      select 1 from public.profiles
      where id = p_user_id and trust_penalty_until is not null and trust_penalty_until > now()
    ) then
      return;
    end if;

    if p_source_type = 'incident_verified' then
      select count(*) into v_month_incidents
      from public.trust_score_ledger
      where user_id = p_user_id
        and source_type = 'incident_verified'
        and created_at >= date_trunc('month', now());

      if v_month_incidents >= 2 then
        return;
      end if;
    end if;

    if p_source_type = 'news_verify_correct' then
      select count(*) into v_today_news
      from public.trust_score_ledger
      where user_id = p_user_id
        and source_type = 'news_verify_correct'
        and created_at >= date_trunc('day', now());

      if v_today_news >= 1 then
        return;
      end if;
    end if;

    v_working_delta := public.trust_apply_diminishing(v_old_score, p_base_delta);

    v_day_left := public.trust_positive_cap_remaining(p_user_id, 'day');
    v_week_left := public.trust_positive_cap_remaining(p_user_id, 'week');
    v_month_left := public.trust_positive_cap_remaining(p_user_id, 'month');

    v_applied_delta := least(v_working_delta, v_day_left, v_week_left, v_month_left);

    if v_applied_delta <= 0 then
      return;
    end if;
  else
    v_applied_delta := p_base_delta;
  end if;

  v_new_score := public.trust_score_hard_cap(p_user_id, v_old_score + v_applied_delta);

  if v_new_score = v_old_score then
    return;
  end if;

  v_applied_delta := v_new_score - v_old_score;

  insert into public.trust_score_ledger (
    user_id, delta, applied_delta, source_type, source_id,
    idempotency_key, score_before, score_after, note
  )
  values (
    p_user_id, p_base_delta, v_applied_delta, p_source_type, p_source_id,
    v_idempotency, v_old_score, v_new_score, p_note
  );

  update public.profiles
  set trust_score = v_new_score, updated_at = now()
  where id = p_user_id;

  if p_source_type in ('report_penalty', 'moderation_penalty') then
    update public.profiles
    set trust_penalty_until = greatest(coalesce(trust_penalty_until, now()), now() + interval '14 days')
    where id = p_user_id;
  end if;

  if v_applied_delta > 0 then
    insert into public.user_badges (user_id, badge_type)
    select p_user_id, 'trusted_contributor'
    from public.profiles
    where id = p_user_id and trust_score >= 80
    on conflict do nothing;
  end if;

  perform public.sync_news_verification_permission(p_user_id);
  perform public.sync_reporter_level(p_user_id);
  perform public.handle_trust_milestones(p_user_id, v_old_score, v_new_score);

  if v_new_score is distinct from v_old_score then
    perform public.notify_profile_user(
      p_user_id,
      'trust_score_change',
      case when v_applied_delta > 0 then 'Güven puanı arttı' else 'Güven puanı düştü' end,
      format('Güven puanınız %s → %s (%s%s)', v_old_score, v_new_score,
        case when v_applied_delta > 0 then '+' else '' end, v_applied_delta),
      jsonb_build_object('oldScore', v_old_score, 'newScore', v_new_score, 'delta', v_applied_delta)
    );
  end if;
end;
$$;

-- Kimlik doğrulama: +8
create or replace function public.on_profile_identity_verified_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_verified = true and (tg_op = 'INSERT' or old.is_verified is distinct from true) then
    perform public.apply_trust_delta(
      new.id, 8, 'identity_verified', new.id::text, 'Kimlik doğrulama'
    );
  end if;
  return new;
end;
$$;

-- Tatil kartı paylaşımı: Uzungöl +4, Rize +3 (her biri tek sefer, admin onayı)
create or replace function public.submit_vacation_card_share(
  p_card_type public.vacation_card_type,
  p_platform text,
  p_post_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Oturum gerekli';
  end if;

  if nullif(trim(p_platform), '') is null or nullif(trim(p_post_url), '') is null then
    raise exception 'Platform ve paylaşım bağlantısı gerekli';
  end if;

  insert into public.vacation_card_share_submissions (user_id, card_type, platform, post_url)
  values (v_uid, p_card_type, trim(p_platform), trim(p_post_url))
  on conflict (user_id, card_type) do update
  set
    platform = excluded.platform,
    post_url = excluded.post_url,
    status = case
      when public.vacation_card_share_submissions.status = 'approved' then 'approved'
      else 'pending'
    end,
    review_note = null,
    reviewed_by = null,
    reviewed_at = null,
    created_at = case
      when public.vacation_card_share_submissions.status = 'approved' then public.vacation_card_share_submissions.created_at
      else now()
    end
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_review_vacation_card_share(
  p_submission_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vacation_card_share_submissions%rowtype;
  v_points int;
  v_label text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_row
  from public.vacation_card_share_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Başvuru bulunamadı';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Bu başvuru zaten incelendi';
  end if;

  if p_approve then
    v_points := case v_row.card_type
      when 'uzungol' then 4
      when 'rize' then 3
    end;
    v_label := case v_row.card_type
      when 'uzungol' then 'Uzungöl tatil kartı paylaşımı'
      when 'rize' then 'Rize tatil kartı paylaşımı'
    end;

    update public.vacation_card_share_submissions
    set
      status = 'approved',
      reviewed_by = auth.uid(),
      review_note = nullif(trim(p_note), ''),
      reviewed_at = now()
    where id = p_submission_id;

    perform public.apply_trust_delta(
      v_row.user_id,
      v_points,
      'vacation_card_share_verified',
      v_row.card_type::text || ':' || v_row.user_id::text,
      v_label
    );

    perform public.notify_profile_user(
      v_row.user_id,
      'trust_score_change',
      'Tatil kartı paylaşımı onaylandı',
      format('%s onaylandı. Güven puanınıza +%s eklendi.', v_label, v_points),
      jsonb_build_object(
        'cardType', v_row.card_type::text,
        'points', v_points,
        'submissionId', p_submission_id
      )
    );
  else
    update public.vacation_card_share_submissions
    set
      status = 'rejected',
      reviewed_by = auth.uid(),
      review_note = nullif(trim(p_note), ''),
      reviewed_at = now()
    where id = p_submission_id;

    perform public.notify_profile_user(
      v_row.user_id,
      'system',
      'Tatil kartı paylaşımı onaylanmadı',
      coalesce(nullif(trim(p_note), ''), 'Paylaşımınız şu an için onaylanmadı. Lütfen Vora tatil kartınızı görünür şekilde paylaştığınızdan emin olun.'),
      jsonb_build_object('submissionId', p_submission_id, 'cardType', v_row.card_type::text)
    );
  end if;
end;
$$;

alter table public.vacation_card_share_submissions enable row level security;

create policy "vacation_card_share_self_read" on public.vacation_card_share_submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy "vacation_card_share_self_insert" on public.vacation_card_share_submissions
  for insert to authenticated
  with check (user_id = auth.uid());

grant execute on function public.submit_vacation_card_share(public.vacation_card_type, text, text) to authenticated;
grant execute on function public.admin_review_vacation_card_share(uuid, boolean, text) to authenticated;
