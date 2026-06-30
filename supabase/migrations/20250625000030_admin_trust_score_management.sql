-- Admin güven puanı düzenleme: set / add / reset + cüzdan hareketinde platform notu

create type public.admin_trust_adjust_action as enum ('set', 'add', 'reset');

create or replace function public.admin_adjust_user_trust_score(
  p_user_id uuid,
  p_action public.admin_trust_adjust_action,
  p_value int default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_old_score int;
  v_new_score int;
  v_applied_delta int;
  v_reason text;
  v_note text;
  v_ledger_id uuid;
  v_reset_score int;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_user_id is null then
    raise exception 'Kullanıcı gerekli';
  end if;

  v_reason := nullif(trim(p_reason), '');
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception 'Düzenleme gerekçesi en az 3 karakter olmalı';
  end if;

  select trust_score into v_old_score
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Kullanıcı bulunamadı';
  end if;

  if p_action = 'reset' then
    v_reset_score := greatest(0, least(100, coalesce(p_value, 50)));

    delete from public.trust_score_ledger where user_id = p_user_id;
    delete from public.trust_milestone_log where user_id = p_user_id;

    if v_reset_score < 100 then
      delete from public.trust_reward_pool where user_id = p_user_id;
    end if;

    v_new_score := v_reset_score;
    v_applied_delta := v_new_score;
    v_note := format(
      'Platform düzenlemesi: Güven puanı geçmişi sıfırlandı (%s puan). %s',
      v_new_score,
      v_reason
    );

    update public.profiles
    set
      trust_score = v_new_score,
      trust_penalty_until = null,
      updated_at = now()
    where id = p_user_id;

    insert into public.trust_score_ledger (
      user_id, delta, applied_delta, source_type, source_id,
      idempotency_key, score_before, score_after, note
    )
    values (
      p_user_id,
      v_applied_delta,
      v_applied_delta,
      'admin_adjust',
      v_admin_id::text,
      'admin_adjust:reset:' || p_user_id::text || ':' || gen_random_uuid()::text,
      0,
      v_new_score,
      v_note
    )
    returning id into v_ledger_id;

  elsif p_action = 'set' then
    if p_value is null then
      raise exception 'Hedef puan gerekli';
    end if;

    v_new_score := greatest(0, least(100, p_value));
    v_applied_delta := v_new_score - v_old_score;

    if v_applied_delta = 0 then
      return jsonb_build_object(
        'user_id', p_user_id,
        'old_score', v_old_score,
        'new_score', v_new_score,
        'applied_delta', 0,
        'unchanged', true
      );
    end if;

    v_note := format(
      'Platform düzenlemesi: Puan %s → %s (%s%s). %s',
      v_old_score,
      v_new_score,
      case when v_applied_delta > 0 then '+' else '' end,
      v_applied_delta,
      v_reason
    );

    insert into public.trust_score_ledger (
      user_id, delta, applied_delta, source_type, source_id,
      idempotency_key, score_before, score_after, note
    )
    values (
      p_user_id,
      v_applied_delta,
      v_applied_delta,
      'admin_adjust',
      v_admin_id::text,
      'admin_adjust:set:' || p_user_id::text || ':' || gen_random_uuid()::text,
      v_old_score,
      v_new_score,
      v_note
    )
    returning id into v_ledger_id;

    update public.profiles
    set trust_score = v_new_score, updated_at = now()
    where id = p_user_id;

  elsif p_action = 'add' then
    if p_value is null or p_value = 0 then
      raise exception 'Değişim miktarı gerekli';
    end if;

    v_new_score := greatest(0, least(100, v_old_score + p_value));
    v_applied_delta := v_new_score - v_old_score;

    if v_applied_delta = 0 then
      return jsonb_build_object(
        'user_id', p_user_id,
        'old_score', v_old_score,
        'new_score', v_new_score,
        'applied_delta', 0,
        'unchanged', true
      );
    end if;

    v_note := format(
      'Platform düzenlemesi: Puan %s → %s (%s%s). %s',
      v_old_score,
      v_new_score,
      case when v_applied_delta > 0 then '+' else '' end,
      v_applied_delta,
      v_reason
    );

    insert into public.trust_score_ledger (
      user_id, delta, applied_delta, source_type, source_id,
      idempotency_key, score_before, score_after, note
    )
    values (
      p_user_id,
      v_applied_delta,
      v_applied_delta,
      'admin_adjust',
      v_admin_id::text,
      'admin_adjust:add:' || p_user_id::text || ':' || gen_random_uuid()::text,
      v_old_score,
      v_new_score,
      v_note
    )
    returning id into v_ledger_id;

    update public.profiles
    set trust_score = v_new_score, updated_at = now()
    where id = p_user_id;
  else
    raise exception 'Geçersiz işlem';
  end if;

  perform public.sync_news_verification_permission(p_user_id);
  perform public.sync_reporter_level(p_user_id);
  perform public.handle_trust_milestones(p_user_id, v_old_score, v_new_score);

  perform public.notify_profile_user(
    p_user_id,
    'trust_score_change',
    'Platform düzenlemesi yapıldı',
    v_note,
    jsonb_build_object(
      'oldScore', v_old_score,
      'newScore', v_new_score,
      'delta', v_applied_delta,
      'adminAdjust', true,
      'reason', v_reason
    )
  );

  return jsonb_build_object(
    'user_id', p_user_id,
    'ledger_id', v_ledger_id,
    'old_score', v_old_score,
    'new_score', v_new_score,
    'applied_delta', v_applied_delta,
    'note', v_note
  );
end;
$$;

create or replace function public.admin_set_user_contribution_score(
  p_user_id uuid,
  p_value int,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_user_id is null then
    raise exception 'Kullanıcı gerekli';
  end if;

  v_reason := nullif(trim(p_reason), '');
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception 'Düzenleme gerekçesi en az 3 karakter olmalı';
  end if;

  update public.profiles
  set
    contribution_score = greatest(0, coalesce(p_value, 0)),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Kullanıcı bulunamadı';
  end if;

  perform public.sync_reporter_level(p_user_id);
end;
$$;

create or replace function public.admin_get_user_trust_ledger(
  p_user_id uuid,
  p_limit int default 30
)
returns setof public.trust_score_ledger
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select *
  from public.trust_score_ledger
  where user_id = p_user_id
  order by created_at desc
  limit greatest(1, least(p_limit, 100));
end;
$$;

grant execute on function public.admin_adjust_user_trust_score(uuid, public.admin_trust_adjust_action, int, text) to authenticated;
grant execute on function public.admin_set_user_contribution_score(uuid, int, text) to authenticated;
grant execute on function public.admin_get_user_trust_ledger(uuid, int) to authenticated;
