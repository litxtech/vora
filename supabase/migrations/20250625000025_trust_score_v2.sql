-- Güven puanı v2: 0–100 ölçek, allowlist, ledger, 80/100 bildirimleri, tatil havuzu

-- ─── Şema ───────────────────────────────────────────────────────────────────

alter table public.profiles
  drop constraint if exists profiles_trust_score_range;

alter table public.profiles
  alter column trust_score set default 50;

alter table public.profiles
  add column if not exists trust_penalty_until timestamptz;

update public.profiles
set trust_score = greatest(50, least(100, round(trust_score / 10.0)))
where trust_score is not null;

alter table public.profiles
  add constraint profiles_trust_score_range check (trust_score between 0 and 100);

create table if not exists public.trust_score_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta smallint not null,
  applied_delta smallint not null,
  source_type text not null,
  source_id text,
  idempotency_key text not null,
  score_before smallint not null,
  score_after smallint not null,
  note text,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists trust_score_ledger_user_created_idx
  on public.trust_score_ledger (user_id, created_at desc);

create index if not exists trust_score_ledger_user_source_idx
  on public.trust_score_ledger (user_id, source_type, created_at desc);

create table if not exists public.trust_milestone_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  milestone smallint not null check (milestone in (80, 100)),
  crossed_at timestamptz not null default now()
);

create index if not exists trust_milestone_log_user_idx
  on public.trust_milestone_log (user_id, milestone, crossed_at desc);

create type public.trust_reward_scan_status as enum (
  'pending_scan',
  'eligible',
  'flagged',
  'rewarded'
);

create table if not exists public.trust_reward_pool (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reached_100_at timestamptz not null default now(),
  scan_status public.trust_reward_scan_status not null default 'pending_scan',
  scan_flags jsonb not null default '[]'::jsonb,
  reward_type text,
  rewarded_at timestamptz,
  updated_at timestamptz not null default now()
);

-- notification_event_type yeni değerleri ayrı migration'da (55P04 önlemi)

-- ─── Yardımcılar ─────────────────────────────────────────────────────────────

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
    when 'day' then 2
    when 'week' then 8
    when 'month' then 20
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

create or replace function public.trust_apply_diminishing(p_score int, p_delta int)
returns int
language sql
immutable
as $$
  select case
    when p_delta <= 0 then p_delta
    when p_score >= 96 then greatest(0, round(p_delta * 0.1))
    when p_score >= 86 then greatest(0, round(p_delta * 0.25))
    when p_score >= 71 then greatest(0, round(p_delta * 0.5))
    else p_delta
  end;
$$;

create or replace function public.trust_score_hard_cap(p_user_id uuid, p_score int)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_created timestamptz;
  v_verified int;
  v_is_verified boolean;
begin
  select created_at, verified_content_count, is_verified
  into v_created, v_verified, v_is_verified
  from public.profiles
  where id = p_user_id;

  if v_created is null then
    return least(p_score, 100);
  end if;

  if v_created > now() - interval '30 days' then
    p_score := least(p_score, 65);
  end if;

  if p_score > 80 and (v_verified < 3 or v_created < now() - interval '60 days') then
    p_score := least(p_score, 80);
  end if;

  if p_score > 90 and exists (
    select 1 from public.trust_score_ledger
    where user_id = p_user_id
      and source_type in ('moderation_penalty', 'report_penalty')
      and created_at > now() - interval '90 days'
  ) then
    p_score := least(p_score, 90);
  end if;

  if p_score > 95 and not coalesce(v_is_verified, false) then
    p_score := least(p_score, 95);
  end if;

  return least(greatest(p_score, 0), 100);
end;
$$;

create or replace function public.scan_trust_reward_pool_entry(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flags jsonb := '[]'::jsonb;
  v_high_quality int;
  v_total_positive int;
  v_verified int;
  v_created timestamptz;
  v_is_verified boolean;
  v_reports int;
  v_status public.trust_reward_scan_status;
begin
  if p_user_id is null then
    return;
  end if;

  select verified_content_count, created_at, is_verified
  into v_verified, v_created, v_is_verified
  from public.profiles
  where id = p_user_id;

  select count(*) into v_reports
  from public.trust_score_ledger
  where user_id = p_user_id
    and source_type = 'report_penalty'
    and created_at > now() - interval '90 days';

  select
    coalesce(sum(applied_delta) filter (
      where source_type in ('incident_verified', 'news_verify_correct')
    ), 0),
    coalesce(sum(applied_delta) filter (where applied_delta > 0), 0)
  into v_high_quality, v_total_positive
  from public.trust_score_ledger
  where user_id = p_user_id;

  if exists (
    select 1 from public.trust_score_ledger
    where user_id = p_user_id
      and source_type = 'moderation_penalty'
      and created_at > now() - interval '180 days'
  ) then
    v_flags := v_flags || jsonb_build_array('recent_moderation');
  end if;

  if coalesce(v_verified, 0) < 5 then
    v_flags := v_flags || jsonb_build_array('low_verified_content');
  end if;

  if not coalesce(v_is_verified, false) then
    v_flags := v_flags || jsonb_build_array('identity_not_verified');
  end if;

  if v_created is null or v_created > now() - interval '90 days' then
    v_flags := v_flags || jsonb_build_array('account_too_new');
  end if;

  if v_reports > 1 then
    v_flags := v_flags || jsonb_build_array('high_report_count');
  end if;

  if v_total_positive > 0 and (v_high_quality::numeric / v_total_positive::numeric) < 0.7 then
    v_flags := v_flags || jsonb_build_array('low_quality_ratio');
  end if;

  if jsonb_array_length(v_flags) = 0 then
    v_status := 'eligible';
  else
    v_status := 'flagged';
  end if;

  update public.trust_reward_pool
  set
    scan_status = v_status,
    scan_flags = v_flags,
    updated_at = now()
  where user_id = p_user_id
    and scan_status in ('pending_scan', 'flagged');
end;
$$;

create or replace function public.handle_trust_milestones(
  p_user_id uuid,
  p_old_score int,
  p_new_score int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_old_score < 80 and p_new_score >= 80 then
    insert into public.trust_milestone_log (user_id, milestone)
    values (p_user_id, 80);

    perform public.notify_profile_user(
      p_user_id,
      'trust_milestone_80',
      'Zirveye çok az kaldı',
      'Güven puanınız 80''e ulaştı. Bu seviyeyi koruyup yükseltmeye devam ederseniz, 100''e ulaştığınızda platform tatil havuzuna alınırsınız. Uzungöl''de kahvaltı dahil 3 günlük konaklama veya platformun belirlediği tatil, uygun üyelere hediye edilebilir.',
      jsonb_build_object('milestone', 80, 'trustScore', p_new_score)
    );
  end if;

  if p_old_score < 100 and p_new_score >= 100 then
    insert into public.trust_milestone_log (user_id, milestone)
    values (p_user_id, 100);

    insert into public.trust_reward_pool (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;

    perform public.scan_trust_reward_pool_entry(p_user_id);

    perform public.notify_profile_user(
      p_user_id,
      'trust_reward_pool',
      'Tebrikler — Zirve Üye!',
      '100 güven puanına ulaştınız ve tatil havuzuna alındınız. Sistem hesabınızı otomatik tarayacak; uygun üyelere platform tarafından tatil hediyesi verilecektir.',
      jsonb_build_object('milestone', 100, 'trustScore', p_new_score)
    );
  end if;
end;
$$;

-- ─── Ana puan motoru ─────────────────────────────────────────────────────────

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

-- Geriye dönük uyumluluk: pozitif delta yalnızca apply_trust_delta üzerinden
create or replace function public.adjust_trust_score(p_user_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_delta = 0 then
    return;
  end if;

  if p_delta > 0 then
    return;
  end if;

  perform public.apply_trust_delta(
    p_user_id,
    p_delta,
    'admin_adjust',
    p_user_id::text || ':legacy:' || md5(random()::text)
  );
end;
$$;

-- ─── Eşik güncellemeleri ─────────────────────────────────────────────────────

create or replace function public.sync_news_verification_permission(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  update public.profiles
  set news_verification_granted = true, updated_at = now()
  where id = p_user_id
    and trust_score >= 70
    and news_verification_granted = false;
end;
$$;

create or replace function public.sync_reporter_level(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution int;
  v_trust int;
  v_level smallint;
begin
  select contribution_score, trust_score
  into v_contribution, v_trust
  from public.profiles where id = p_user_id;

  if not found then
    return;
  end if;

  if v_contribution >= 1000 and v_trust >= 90 then
    v_level := 5;
  elsif v_contribution >= 400 then
    v_level := 4;
  elsif v_contribution >= 150 then
    v_level := 3;
  elsif v_contribution >= 50 then
    v_level := 2;
  else
    v_level := 1;
  end if;

  update public.profiles
  set reporter_level = v_level, updated_at = now()
  where id = p_user_id and reporter_level is distinct from v_level;
end;
$$;

create or replace function public.trg_profiles_sync_news_verification_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trust_score is distinct from old.trust_score and new.trust_score >= 70 then
    new.news_verification_granted := true;
  end if;
  return new;
end;
$$;

create or replace function public.trg_profiles_init_news_verification_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trust_score >= 70 then
    new.news_verification_granted := true;
  end if;
  return new;
end;
$$;

update public.profiles
set news_verification_granted = true
where trust_score >= 70
  and news_verification_granted = false;

-- ─── Tetikleyiciler ──────────────────────────────────────────────────────────

-- Gönderi: güven puanı YOK
create or replace function public.on_post_published_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform public.adjust_contribution_score(new.author_id, 5);
    perform public.award_achievement(new.author_id, 'first_post');
  end if;
  return new;
end;
$$;

-- Doğrulanmış olay: +3
create or replace function public.on_incident_verified_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_verified boolean := false;
begin
  if new.status = 'verified' and (tg_op = 'INSERT' or old.status is distinct from 'verified') then
    select verified_content_count >= 1 into v_was_verified
    from public.profiles
    where id = new.reporter_id;

    update public.profiles
    set verified_content_count = verified_content_count + 1,
        updated_at = now()
    where id = new.reporter_id;

    perform public.apply_trust_delta(
      new.reporter_id, 3, 'incident_verified', new.id::text, 'Doğrulanmış olay bildirimi'
    );

    if not v_was_verified then
      perform public.apply_trust_delta(
        new.reporter_id, 2, 'first_verified_content', new.reporter_id::text, 'İlk doğrulanmış içerik'
      );
    end if;

    perform public.adjust_contribution_score(new.reporter_id, 20);
    perform public.award_achievement(new.reporter_id, 'first_verified_incident');
  end if;
  return new;
end;
$$;

-- Şikayet cezaları
create or replace function public.on_content_reported_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_penalty int;
begin
  v_user_id := public.resolve_report_target_user(new.target_type, new.target_id);
  if v_user_id is null or v_user_id = new.reporter_id then
    return new;
  end if;

  v_penalty := case new.reason
    when 'spam' then -3
    when 'misinformation' then -6
    when 'child_safety' then -15
    when 'harassment' then -8
    when 'fraud' then -8
    when 'abuse' then -8
    when 'violence' then -8
    else -3
  end;

  perform public.apply_trust_delta(
    v_user_id, v_penalty, 'report_penalty', new.id::text, new.reason::text
  );
  return new;
end;
$$;

-- Moderasyon cezaları
create or replace function public.on_moderation_action_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_penalty int;
begin
  v_user_id := public.resolve_moderation_target_user(new.target_type, new.target_id);
  if v_user_id is null then
    return new;
  end if;

  v_penalty := case new.action
    when 'warn' then -5
    when 'hide' then -10
    when 'remove' then -12
    when 'ban' then -50
    else -5
  end;

  perform public.apply_trust_delta(
    v_user_id, v_penalty, 'moderation_penalty', new.id::text, new.action::text
  );
  return new;
end;
$$;

-- 15+ beğenili yorum: +1
create or replace function public.on_comment_liked_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
begin
  if new.like_count >= 15 and (tg_op = 'INSERT' or old.like_count < 15) then
    select author_id into v_author_id from public.post_comments where id = new.id;
    if v_author_id is not null and new.created_at <= now() - interval '24 hours' then
      perform public.apply_trust_delta(
        v_author_id, 1, 'comment_quality', new.id::text, 'Faydalı yorum'
      );
      perform public.adjust_contribution_score(v_author_id, 5);
    end if;
  end if;
  return new;
end;
$$;

-- Haber doğrulama: doğru +2, yanlış -4
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
  v_delta integer;
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
end;
$$;

-- Etkinlik 20+ katılımcı: organizatöre +2
create or replace function public.on_event_rsvp_trust_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_going_count int;
  v_organizer_id uuid;
begin
  if new.status <> 'going' then
    return new;
  end if;

  select e.organizer_id into v_organizer_id
  from public.events e
  where e.id = new.event_id;

  if v_organizer_id is null then
    return new;
  end if;

  select count(*) into v_going_count
  from public.event_rsvps
  where event_id = new.event_id and status = 'going';

  if v_going_count = 20 then
    perform public.apply_trust_delta(
      v_organizer_id, 2, 'event_success', new.event_id::text, 'Başarılı etkinlik (20+ katılım)'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists event_rsvp_trust_reward on public.event_rsvps;
create trigger event_rsvp_trust_reward
  after insert or update of status on public.event_rsvps
  for each row execute function public.on_event_rsvp_trust_reward();

-- Kimlik doğrulama: +3
create or replace function public.on_profile_identity_verified_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_verified = true and (tg_op = 'INSERT' or old.is_verified is distinct from true) then
    perform public.apply_trust_delta(
      new.id, 3, 'identity_verified', new.id::text, 'Kimlik doğrulama'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profile_identity_verified_trust on public.profiles;
create trigger profile_identity_verified_trust
  after insert or update of is_verified on public.profiles
  for each row execute function public.on_profile_identity_verified_trust();

-- Temiz geçmiş ödülleri
create or replace function public.check_clean_streak_trust_rewards(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created timestamptz;
  v_has_penalty_30 boolean;
  v_has_penalty_90 boolean;
begin
  select created_at into v_created from public.profiles where id = p_user_id;
  if v_created is null then
    return;
  end if;

  select exists (
    select 1 from public.trust_score_ledger
    where user_id = p_user_id
      and applied_delta < 0
      and created_at > now() - interval '30 days'
  ) into v_has_penalty_30;

  select exists (
    select 1 from public.trust_score_ledger
    where user_id = p_user_id
      and applied_delta < 0
      and created_at > now() - interval '90 days'
  ) into v_has_penalty_90;

  if v_created <= now() - interval '30 days' and not v_has_penalty_30 then
    perform public.apply_trust_delta(
      p_user_id, 2, 'clean_streak_30d',
      to_char(date_trunc('month', now()), 'YYYY-MM'),
      '30 gün temiz geçmiş'
    );
  end if;

  if v_created <= now() - interval '90 days' and not v_has_penalty_90 then
    perform public.apply_trust_delta(
      p_user_id, 1, 'clean_streak_90d',
      to_char(date_trunc('quarter', now()), 'YYYY-"Q"Q'),
      '90 gün temiz geçmiş'
    );
  end if;
end;
$$;

create or replace function public.trg_check_clean_streak_after_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.applied_delta > 0 then
    perform public.check_clean_streak_trust_rewards(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trust_ledger_clean_streak on public.trust_score_ledger;
create trigger trust_ledger_clean_streak
  after insert on public.trust_score_ledger
  for each row execute function public.trg_check_clean_streak_after_trust();

-- Görev ödülünden güven puanı kaldır
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
    when 'points' then
      perform public.adjust_contribution_score(p_user_id, v_def.reward_value);
    when 'kuru' then
      perform public.adjust_kuru_balance(
        p_user_id,
        v_def.reward_value,
        'task_reward',
        'daily_task',
        p_task_key,
        null,
        v_def.title,
        null,
        'task:' || p_user_id::text || ':' || p_task_key || ':' || p_task_date::text
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

  if (
    select count(*) = (select count(*) from public.daily_task_definitions where is_active = true)
    from public.user_daily_task_progress p
    where p.user_id = p_user_id
      and p.task_date = p_task_date
      and p.claimed_at is not null
  ) then
    perform public.award_achievement(p_user_id, 'daily_tasks_complete', 'Tüm günlük görevler');
    insert into public.premium_subscriptions (user_id, plan, status, starts_at, expires_at)
    values (p_user_id, 'monthly', 'active', now(), now() + interval '1 day');
    perform public.sync_premium_status(p_user_id);
    if to_regprocedure('public.adjust_kuru_balance(uuid,integer,public.kuru_transaction_type,public.kuru_source_type,text,uuid,text,uuid,text)') is not null then
      perform public.adjust_kuru_balance(
        p_user_id,
        25,
        'bonus',
        'daily_task',
        'daily_tasks_complete',
        null,
        'Tüm günlük görevler bonusu',
        null,
        'bonus:all_tasks:' || p_user_id::text || ':' || p_task_date::text
      );
    end if;
  end if;

  return jsonb_build_object(
    'task_key', p_task_key,
    'reward_type', v_def.reward_type,
    'reward_value', v_def.reward_value
  );
end;
$$;
  $claim$;
end $outer$;

-- Mevcut 100 kullanıcıları havuza al
insert into public.trust_reward_pool (user_id, reached_100_at, scan_status)
select id, now(), 'pending_scan'::public.trust_reward_scan_status
from public.profiles
where trust_score >= 100
on conflict (user_id) do nothing;

update public.profiles
set trust_score = 50
where trust_score is null;

alter table public.trust_score_ledger enable row level security;
alter table public.trust_milestone_log enable row level security;
alter table public.trust_reward_pool enable row level security;

create policy "trust_score_ledger_self_read" on public.trust_score_ledger
  for select to authenticated using (user_id = auth.uid() or public.is_moderator());

create policy "trust_milestone_log_self_read" on public.trust_milestone_log
  for select to authenticated using (user_id = auth.uid() or public.is_moderator());

create policy "trust_reward_pool_self_read" on public.trust_reward_pool
  for select to authenticated using (user_id = auth.uid() or public.is_moderator());

grant execute on function public.apply_trust_delta(uuid, int, text, text, text) to authenticated;
grant execute on function public.scan_trust_reward_pool_entry(uuid) to authenticated;
