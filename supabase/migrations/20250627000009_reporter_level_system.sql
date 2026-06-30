-- Muhabir seviyesi: doğru haber doğrulaması + güven puanı (katkı puanı değil)

create or replace function public.compute_reporter_level(
  p_user_id uuid,
  p_correct_count int default null,
  p_trust_score int default null,
  p_role public.user_role default null
)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_trust int;
  v_correct int;
begin
  if p_role is null or p_trust_score is null then
    select role, trust_score
    into v_role, v_trust
    from public.profiles
    where id = p_user_id;
  else
    v_role := p_role;
    v_trust := p_trust_score;
  end if;

  if v_role is null then
    return 1;
  end if;

  if v_role not in ('verified_reporter', 'moderator', 'admin', 'super_admin') then
    return 1;
  end if;

  if p_correct_count is null then
    select count(*)::int into v_correct
    from public.news_verifications
    where reporter_id = p_user_id
      and result = 'correct';
  else
    v_correct := p_correct_count;
  end if;

  if v_correct >= 75 and v_trust >= 92 then
    return 5;
  elsif v_correct >= 35 and v_trust >= 85 then
    return 4;
  elsif v_correct >= 15 and v_trust >= 70 then
    return 3;
  elsif v_correct >= 5 and v_trust >= 55 then
    return 2;
  end if;

  return 1;
end;
$$;

create or replace function public.sync_reporter_level(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_level smallint;
  v_new_level smallint;
  v_role public.user_role;
begin
  if p_user_id is null then
    return;
  end if;

  select reporter_level, role
  into v_old_level, v_role
  from public.profiles
  where id = p_user_id;

  if not found then
    return;
  end if;

  v_new_level := public.compute_reporter_level(p_user_id);

  update public.profiles
  set reporter_level = v_new_level, updated_at = now()
  where id = p_user_id
    and reporter_level is distinct from v_new_level;

  if v_new_level > coalesce(v_old_level, 1)
     and v_role in ('verified_reporter', 'moderator', 'admin', 'super_admin') then
    perform public.notify_profile_user(
      p_user_id,
      'trust_score_change',
      'Muhabir seviyesi yükseldi',
      format('Tebrikler! Muhabir seviyeniz %s → %s oldu.', v_old_level, v_new_level),
      jsonb_build_object('oldLevel', v_old_level, 'newLevel', v_new_level, 'kind', 'reporter_level_up')
    );
  end if;
end;
$$;

create or replace function public.get_reporter_level_progress(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_role public.user_role;
  v_trust int;
  v_level smallint;
  v_correct int;
  v_is_reporter boolean;
  v_next_level smallint;
  v_next_correct int;
  v_next_trust int;
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısınız';
  end if;

  if v_uid is distinct from auth.uid() and not public.is_moderator() then
    raise exception 'Yetkisiz erişim';
  end if;

  select role, trust_score, reporter_level
  into v_role, v_trust, v_level
  from public.profiles
  where id = v_uid;

  if not found then
    return '{}'::jsonb;
  end if;

  select count(*)::int into v_correct
  from public.news_verifications
  where reporter_id = v_uid
    and result = 'correct';

  v_is_reporter := v_role in ('verified_reporter', 'moderator', 'admin', 'super_admin');
  v_level := public.compute_reporter_level(v_uid, v_correct, v_trust, v_role);

  v_next_level := least(5, v_level + 1);
  v_next_correct := case v_next_level
    when 2 then 5
    when 3 then 15
    when 4 then 35
    when 5 then 75
    else 75
  end;
  v_next_trust := case v_next_level
    when 2 then 55
    when 3 then 70
    when 4 then 85
    when 5 then 92
    else 92
  end;

  return jsonb_build_object(
    'level', v_level,
    'correct_verifications', v_correct,
    'trust_score', v_trust,
    'is_reporter', v_is_reporter,
    'max_level', v_level >= 5,
    'next_level', case when v_level >= 5 then null else v_next_level end,
    'next_level_correct', case when v_level >= 5 then null else v_next_correct end,
    'next_level_trust', case when v_level >= 5 then null else v_next_trust end
  );
end;
$$;

-- Doğrulama sonrası seviye güncelle
create or replace function public.verify_content(
  p_reporter_id uuid,
  p_result public.news_verification_result,
  p_note text default null,
  p_post_id uuid default null,
  p_reel_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_verification_id uuid;
begin
  if num_nonnulls(p_post_id, p_reel_id) <> 1 then
    raise exception 'post_id veya reel_id gerekli';
  end if;

  select role into v_role from public.profiles where id = p_reporter_id;

  if v_role not in ('verified_reporter', 'moderator', 'admin', 'super_admin') then
    raise exception 'Muhabir yetkisi gerekli';
  end if;

  if p_post_id is not null then
    update public.news_verifications
    set result = p_result, note = p_note,
        score_delta = case p_result when 'correct' then 2 when 'incorrect' then -4 else 0 end,
        created_at = now()
    where post_id = p_post_id and reporter_id = p_reporter_id;

    if not found then
      insert into public.news_verifications (post_id, reporter_id, result, note, score_delta)
      values (
        p_post_id, p_reporter_id, p_result, p_note,
        case p_result when 'correct' then 2 when 'incorrect' then -4 else 0 end
      )
      returning id into v_verification_id;
    else
      select id into v_verification_id
      from public.news_verifications
      where post_id = p_post_id and reporter_id = p_reporter_id;
    end if;
  else
    update public.news_verifications
    set result = p_result, note = p_note,
        score_delta = case p_result when 'correct' then 2 when 'incorrect' then -4 else 0 end,
        created_at = now()
    where reel_id = p_reel_id and reporter_id = p_reporter_id;

    if not found then
      insert into public.news_verifications (reel_id, reporter_id, result, note, score_delta)
      values (
        p_reel_id, p_reporter_id, p_result, p_note,
        case p_result when 'correct' then 2 when 'incorrect' then -4 else 0 end
      )
      returning id into v_verification_id;
    else
      select id into v_verification_id
      from public.news_verifications
      where reel_id = p_reel_id and reporter_id = p_reporter_id;
    end if;
  end if;

  if p_result = 'correct' then
    perform public.apply_trust_delta(
      p_reporter_id, 2, 'news_verify_correct', v_verification_id::text, 'Doğru haber doğrulaması'
    );
    perform public.adjust_contribution_score(p_reporter_id, 2);
  elsif p_result = 'incorrect' then
    perform public.apply_trust_delta(
      p_reporter_id, -4, 'news_verify_incorrect', v_verification_id::text, 'Yanlış haber doğrulaması'
    );
  end if;

  perform public.sync_reporter_level(p_reporter_id);
end;
$$;

-- Başvuru onayı: seviye 1, katkı puanı bonusu kaldırıldı
create or replace function public.review_reporter_application(
  p_application_id uuid,
  p_reviewer_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.reporter_applications%rowtype;
  v_reviewer_role public.user_role;
begin
  select role into v_reviewer_role from public.profiles where id = p_reviewer_id;

  if v_reviewer_role not in ('admin', 'super_admin', 'moderator') then
    raise exception 'Yetkisiz';
  end if;

  select * into v_app from public.reporter_applications where id = p_application_id;

  if not found or v_app.status <> 'pending' then
    raise exception 'Başvuru bulunamadı veya zaten işlendi';
  end if;

  update public.reporter_applications
  set
    status = case when p_approve then 'approved'::public.reporter_application_status else 'rejected'::public.reporter_application_status end,
    reviewed_by = p_reviewer_id,
    review_note = p_note,
    reviewed_at = now()
  where id = p_application_id;

  if p_approve then
    update public.profiles
    set role = 'verified_reporter', reporter_level = 1, updated_at = now()
    where id = v_app.user_id;

    insert into public.user_badges (user_id, badge_type)
    values (v_app.user_id, 'reporter')
    on conflict do nothing;

    perform public.sync_reporter_level(v_app.user_id);
  end if;
end;
$$;

-- Mevcut muhabirlerin seviyelerini yeniden hesapla
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in select id from public.profiles loop
    perform public.sync_reporter_level(v_user_id);
  end loop;
end $$;

grant execute on function public.compute_reporter_level(uuid, int, int, public.user_role) to authenticated;
grant execute on function public.get_reporter_level_progress(uuid) to authenticated;
