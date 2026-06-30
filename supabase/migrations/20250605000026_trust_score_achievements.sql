-- Güven puanı otomasyonu ve başarım sistemi

-- Muhabir seviyesi senkronizasyonu (adjust_* fonksiyonlarından önce tanımlanmalı)
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

  if v_contribution >= 1000 and v_trust >= 250 then
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

-- Güven puanı ayarla (0–1000 arası)
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

  update public.profiles
  set trust_score = greatest(0, least(1000, trust_score + p_delta)),
      updated_at = now()
  where id = p_user_id;

  -- Güvenilir katkıcı rozeti (200+ puan)
  if p_delta > 0 then
    insert into public.user_badges (user_id, badge_type)
    select p_user_id, 'trusted_contributor'
    from public.profiles
    where id = p_user_id and trust_score >= 200
    on conflict do nothing;
  end if;

  perform public.sync_reporter_level(p_user_id);
end;
$$;

-- Katkı puanı ayarla
create or replace function public.adjust_contribution_score(p_user_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_delta = 0 then
    return;
  end if;

  update public.profiles
  set contribution_score = greatest(0, contribution_score + p_delta),
      updated_at = now()
  where id = p_user_id;

  perform public.sync_reporter_level(p_user_id);
end;
$$;

-- Başarım ver
create or replace function public.award_achievement(p_user_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_key is null then
    return;
  end if;

  insert into public.user_achievements (user_id, achievement_key)
  values (p_user_id, p_key)
  on conflict do nothing;
end;
$$;

-- Rapor hedefinden kullanıcı ID çöz
create or replace function public.resolve_report_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  case p_target_type
    when 'profile' then return p_target_id;
    when 'post' then
      select author_id into v_user_id from public.posts where id = p_target_id;
      return v_user_id;
    when 'comment' then
      select author_id into v_user_id from public.post_comments where id = p_target_id;
      return v_user_id;
    else return null;
  end case;
end;
$$;

-- Moderasyon hedefinden kullanıcı ID çöz
create or replace function public.resolve_moderation_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.resolve_report_target_user(p_target_type, p_target_id);
end;
$$;

-- Gönderi paylaşımı → güven + katkı + ilk gönderi başarımı
create or replace function public.on_post_published_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform public.adjust_trust_score(new.author_id, 2);
    perform public.adjust_contribution_score(new.author_id, 5);
    perform public.award_achievement(new.author_id, 'first_post');
  end if;
  return new;
end;
$$;

drop trigger if exists posts_published_trust on public.posts;
create trigger posts_published_trust
  after insert or update of status on public.posts
  for each row execute function public.on_post_published_trust();

-- Doğrulanmış olay → güven + doğrulanmış içerik sayısı
create or replace function public.on_incident_verified_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'verified' and (tg_op = 'INSERT' or old.status is distinct from 'verified') then
    update public.profiles
    set verified_content_count = verified_content_count + 1,
        updated_at = now()
    where id = new.reporter_id;

    perform public.adjust_trust_score(new.reporter_id, 15);
    perform public.adjust_contribution_score(new.reporter_id, 20);
    perform public.award_achievement(new.reporter_id, 'first_verified_incident');
  end if;
  return new;
end;
$$;

drop trigger if exists incident_verified_trust on public.incident_reports;
create trigger incident_verified_trust
  after insert or update of status on public.incident_reports
  for each row execute function public.on_incident_verified_trust();

-- Şikayet → güven düşürme
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
    when 'spam' then -5
    when 'misinformation' then -15
    when 'child_safety' then -20
    when 'harassment' then -10
    when 'fraud' then -10
    when 'abuse' then -10
    when 'violence' then -10
    else -5
  end;

  perform public.adjust_trust_score(v_user_id, v_penalty);
  return new;
end;
$$;

drop trigger if exists content_reported_trust on public.content_reports;
create trigger content_reported_trust
  after insert on public.content_reports
  for each row execute function public.on_content_reported_trust();

-- Moderasyon cezası → güven düşürme
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
    when 'warn' then -10
    when 'hide' then -20
    when 'remove' then -30
    when 'ban' then -100
    else -10
  end;

  perform public.adjust_trust_score(v_user_id, v_penalty);
  return new;
end;
$$;

drop trigger if exists moderation_action_trust on public.moderation_actions;
create trigger moderation_action_trust
  after insert on public.moderation_actions
  for each row execute function public.on_moderation_action_trust();

-- Faydalı yorum (10+ beğeni) → güven artışı
create or replace function public.on_comment_liked_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
begin
  if new.like_count >= 10 and (tg_op = 'INSERT' or old.like_count < 10) then
    select author_id into v_author_id from public.post_comments where id = new.id;
    if v_author_id is not null then
      perform public.adjust_trust_score(v_author_id, 3);
      perform public.adjust_contribution_score(v_author_id, 5);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comment_liked_trust on public.post_comments;
create trigger comment_liked_trust
  after update of like_count on public.post_comments
  for each row execute function public.on_comment_liked_trust();

-- Beğeni / görüntülenme başarımları
create or replace function public.check_post_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_views bigint;
begin
  if new.like_count >= 100 and (old.like_count < 100) then
    perform public.award_achievement(new.author_id, 'first_100_likes');
  end if;

  if new.view_count >= 1000 and (old.view_count < 1000) then
    perform public.award_achievement(new.author_id, 'first_1000_views');
  end if;

  -- Toplam görüntülenme başarımı (tüm gönderiler)
  select coalesce(sum(view_count), 0) into v_total_views
  from public.posts where author_id = new.author_id and status = 'published';

  if v_total_views >= 1000 then
    perform public.award_achievement(new.author_id, 'first_1000_views');
  end if;

  return new;
end;
$$;

drop trigger if exists post_milestones_check on public.posts;
create trigger post_milestones_check
  after update of like_count, view_count on public.posts
  for each row execute function public.check_post_milestones();

-- İş arayan profili → ilk iş başvurusu başarımı
create or replace function public.on_job_seeker_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_achievement(new.user_id, 'first_job_application');
  return new;
end;
$$;

drop trigger if exists job_seeker_achievement on public.job_seekers;
create trigger job_seeker_achievement
  after insert on public.job_seekers
  for each row execute function public.on_job_seeker_created();
