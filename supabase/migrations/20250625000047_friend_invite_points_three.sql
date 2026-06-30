-- Davet kodu bildirimi + 3 puan (enum 46'da eklendikten sonra)

insert into public.notification_sound_settings (event_type, label) values
  ('friend_invite_referral', 'Arkadaş Daveti')
on conflict (event_type) do nothing;

-- Davet eden için özel bildirim gönderileceğinden genel güven puanı bildirimini atla
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
    'friend_invite_referral'
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

create or replace function public.redeem_friend_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text;
  v_inviter_id uuid;
  v_invitee_username text;
  v_points constant int := 3;
begin
  if v_user_id is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  v_normalized := public.normalize_friend_invite_code(p_code);

  if char_length(v_normalized) < 6 then
    return jsonb_build_object('ok', false, 'error', 'Geçersiz davet kodu');
  end if;

  if exists (select 1 from public.friend_invite_redemptions where invitee_id = v_user_id) then
    return jsonb_build_object('ok', false, 'error', 'Zaten bir davet kodu kullandınız');
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

  if exists (select 1 from public.friend_invite_redemptions where inviter_id = v_inviter_id) then
    return jsonb_build_object('ok', false, 'error', 'Bu davet kodu artık kullanılamıyor');
  end if;

  select coalesce(nullif(trim(username), ''), 'Bir kullanıcı')
  into v_invitee_username
  from public.profiles
  where id = v_user_id;

  insert into public.friend_invite_redemptions (inviter_id, invitee_id, invite_code)
  values (v_inviter_id, v_user_id, v_normalized);

  perform public.apply_trust_delta(
    v_user_id, v_points, 'friend_invite_redeemed', v_user_id::text, 'Arkadaş davet kodu kullanımı'
  );

  perform public.apply_trust_delta(
    v_inviter_id, v_points, 'friend_invite_referral', v_user_id::text, 'Arkadaş daveti'
  );

  perform public.notify_profile_user(
    v_inviter_id,
    'friend_invite_referral',
    'Davet kodunuz kullanıldı',
    format(
      '%s davet kodunuzu girdi ve aktif oldu. %s puan hesabınıza tanımlandı.',
      v_invitee_username,
      v_points
    ),
    jsonb_build_object(
      'inviteeId', v_user_id,
      'inviteeUsername', v_invitee_username,
      'points', v_points
    )
  );

  return jsonb_build_object('ok', true, 'points', v_points);
end;
$$;
