-- Günlük görev ödülleri: güven puanı (apply_trust_delta), Kuru yok

-- apply_trust_delta: günlük görev kaynak türleri
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
    'clean_streak_90d',
    'friend_invite_redeemed',
    'friend_invite_referral',
    'daily_task',
    'daily_tasks_complete'
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

  if v_new_score is distinct from v_old_score
     and p_source_type is distinct from 'friend_invite_referral' then
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

-- Ödül talep: güven puanı + başarım (Kuru / katkı puanı yok)
do $outer$
begin
  if to_regclass('public.user_daily_task_progress') is null then
    return;
  end if;

  execute $claim$
create or replace function public.claim_daily_task_reward(
  p_user_id uuid,
  p_task_key text,
  p_task_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_daily_task_progress%rowtype;
  v_def public.daily_task_definitions%rowtype;
  v_all_claimed boolean;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Yetkisiz erişim';
  end if;

  select * into v_row
  from public.user_daily_task_progress
  where user_id = p_user_id and task_key = p_task_key and task_date = p_task_date;

  if not found or v_row.completed_at is null or v_row.claimed_at is not null then
    raise exception 'Ödül talep edilemez';
  end if;

  select * into v_def from public.daily_task_definitions where key = p_task_key;

  update public.user_daily_task_progress
  set claimed_at = now()
  where user_id = p_user_id and task_key = p_task_key and task_date = p_task_date;

  case v_def.reward_type
    when 'points', 'kuru' then
      perform public.apply_trust_delta(
        p_user_id,
        v_def.reward_value,
        'daily_task',
        p_task_key || ':' || p_task_date::text,
        v_def.title
      );
    when 'badge' then
      if v_def.reward_key is not null then
        insert into public.user_badges (user_id, badge_type)
        values (p_user_id, v_def.reward_key::public.badge_type)
        on conflict do nothing;
      end if;
    when 'achievement' then
      if v_def.reward_key is not null then
        perform public.award_achievement(p_user_id, v_def.reward_key, v_def.title);
      end if;
    when 'premium_days' then
      insert into public.premium_subscriptions (user_id, plan, status, starts_at, expires_at)
      values (
        p_user_id,
        'monthly',
        'active',
        now(),
        now() + (v_def.reward_value || ' days')::interval
      );
      perform public.sync_premium_status(p_user_id);
  end case;

  select (
    select count(*) = (select count(*) from public.daily_task_definitions where is_active = true)
    from public.user_daily_task_progress p
    where p.user_id = p_user_id
      and p.task_date = p_task_date
      and p.claimed_at is not null
  ) into v_all_claimed;

  if v_all_claimed then
    perform public.award_achievement(p_user_id, 'daily_tasks_complete', 'Tüm günlük görevler');
    perform public.apply_trust_delta(
      p_user_id,
      2,
      'daily_tasks_complete',
      p_task_date::text,
      'Tüm günlük görevler bonusu'
    );
  end if;

  return jsonb_build_object(
    'task_key', p_task_key,
    'reward_type', 'points',
    'reward_value', v_def.reward_value
  );
end;
$$;
  $claim$;
end $outer$;
