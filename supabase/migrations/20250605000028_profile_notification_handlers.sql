-- Profil bildirimleri: ses ayarları, fonksiyonlar ve tetikleyiciler

insert into public.notification_sound_settings (event_type, label) values
  ('trust_score_change', 'Güven Puanı'),
  ('achievement_earned', 'Başarım'),
  ('badge_earned', 'Rozet')
on conflict (event_type) do nothing;

-- Profil bildirimi oluştur
create or replace function public.notify_profile_user(
  p_user_id uuid,
  p_event_type public.notification_event_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, event_type, title, body, data)
  values (p_user_id, p_event_type, p_title, p_body, p_data);

  insert into public.notification_outbox (recipient_id, event_type, title, body, data)
  values (p_user_id, p_event_type, p_title, p_body, p_data);
end;
$$;

-- Güven puanı fonksiyonunu bildirimli güncelle
create or replace function public.adjust_trust_score(p_user_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_score int;
  v_new_score int;
begin
  if p_user_id is null or p_delta = 0 then
    return;
  end if;

  select trust_score into v_old_score from public.profiles where id = p_user_id;
  if not found then
    return;
  end if;

  v_new_score := greatest(0, least(1000, v_old_score + p_delta));

  update public.profiles
  set trust_score = v_new_score, updated_at = now()
  where id = p_user_id;

  if p_delta > 0 then
    insert into public.user_badges (user_id, badge_type)
    select p_user_id, 'trusted_contributor'
    from public.profiles
    where id = p_user_id and trust_score >= 200
    on conflict do nothing;
  end if;

  perform public.sync_reporter_level(p_user_id);

  if v_new_score is distinct from v_old_score then
    perform public.notify_profile_user(
      p_user_id,
      'trust_score_change',
      case when p_delta > 0 then 'Güven puanı arttı' else 'Güven puanı düştü' end,
      format('Güven puanınız %s → %s (%s%s)', v_old_score, v_new_score, case when p_delta > 0 then '+' else '' end, p_delta),
      jsonb_build_object('oldScore', v_old_score, 'newScore', v_new_score, 'delta', p_delta)
    );
  end if;
end;
$$;

-- Başarım bildirimi
create or replace function public.award_achievement(p_user_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean;
begin
  if p_user_id is null or p_key is null then
    return;
  end if;

  insert into public.user_achievements (user_id, achievement_key)
  values (p_user_id, p_key)
  on conflict do nothing
  returning true into v_inserted;

  if v_inserted then
    perform public.notify_profile_user(
      p_user_id,
      'achievement_earned',
      'Yeni başarım!',
      'Tebrikler! Yeni bir başarım kazandınız.',
      jsonb_build_object('achievementKey', p_key)
    );
  end if;
end;
$$;

-- Rozet kazanımında bildirim
create or replace function public.on_badge_earned_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_profile_user(
    new.user_id,
    'badge_earned',
    'Yeni rozet!',
    format('"%s" rozetini kazandınız.', new.badge_type::text),
    jsonb_build_object('badgeType', new.badge_type::text)
  );
  return new;
end;
$$;

drop trigger if exists user_badges_earned_notify on public.user_badges;
create trigger user_badges_earned_notify
  after insert on public.user_badges
  for each row execute function public.on_badge_earned_notify();
