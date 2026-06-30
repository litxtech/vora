-- Başarım bildirimlerinde kazanılan başarım adı ve kaynağı göster

create or replace function public.award_achievement(
  p_user_id uuid,
  p_key text,
  p_source text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean;
  v_label text;
  v_default_source text;
  v_source text;
begin
  if p_user_id is null or p_key is null then
    return;
  end if;

  select
    case p_key
      when 'first_post' then 'İlk Gönderi'
      when 'first_100_likes' then '100 Beğeni'
      when 'first_1000_views' then '1000 Görüntülenme'
      when 'first_verified_incident' then 'İlk Doğrulanmış Olay'
      when 'first_job_application' then 'İlk İş Başvurusu'
      when 'daily_tasks_complete' then 'Günlük Kahraman'
      when 'first_event_rsvp' then 'İlk Etkinlik Katılımı'
      when 'events_10_rsvp' then '10 Etkinlik Katılımı'
      when 'first_event_created' then 'İlk Etkinlik'
      when 'event_community_leader' then 'Topluluk Lideri'
      else initcap(replace(p_key, '_', ' '))
    end,
    case p_key
      when 'first_post' then 'Gönderi paylaşımı'
      when 'first_100_likes' then 'Gönderi beğenileri'
      when 'first_1000_views' then 'Gönderi görüntülenmeleri'
      when 'first_verified_incident' then 'Olay bildirimi'
      when 'first_job_application' then 'İş başvurusu'
      when 'daily_tasks_complete' then 'Günlük görevler'
      when 'first_event_rsvp' then 'Etkinlik katılımı'
      when 'events_10_rsvp' then 'Etkinlik katılımları'
      when 'first_event_created' then 'Etkinlik oluşturma'
      when 'event_community_leader' then 'Etkinlik organizasyonu'
      else 'Platform aktivitesi'
    end
  into v_label, v_default_source;

  v_source := coalesce(nullif(trim(p_source), ''), v_default_source);

  insert into public.user_achievements (user_id, achievement_key)
  values (p_user_id, p_key)
  on conflict do nothing
  returning true into v_inserted;

  if v_inserted then
    perform public.notify_profile_user(
      p_user_id,
      'achievement_earned',
      format('"%s" başarımı kazandınız', v_label),
      format('Tebrikler! %s sayesinde "%s" başarımını kazandınız.', v_source, v_label),
      jsonb_build_object(
        'achievementKey', p_key,
        'achievementLabel', v_label,
        'achievementSource', v_source
      )
    );
  end if;
end;
$$;

-- Etkinlik RSVP başarımlarında etkinlik adını kaynak olarak kullan
create or replace function public.on_event_rsvp_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_user_going_count int;
  v_event_title text;
begin
  select conversation_id, title
  into v_conversation_id, v_event_title
  from public.events
  where id = new.event_id;

  if new.status in ('going', 'maybe') and v_conversation_id is not null then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, new.user_id, 'member')
    on conflict do nothing;
  end if;

  if new.status = 'going' then
    perform public.award_achievement(new.user_id, 'first_event_rsvp', v_event_title);

    select count(*) into v_user_going_count
    from public.event_rsvps
    where user_id = new.user_id and status = 'going';

    if v_user_going_count >= 10 then
      perform public.award_achievement(
        new.user_id,
        'events_10_rsvp',
        format('%s etkinliğe katılım', v_user_going_count)
      );
    end if;

    insert into public.event_reminder_queue (event_id, user_id, reminder_kind, scheduled_at)
    select
      e.id,
      new.user_id,
      r.kind,
      e.starts_at - r.reminder_offset
    from public.events e
    cross join (
      values
        ('24h'::text, interval '24 hours'),
        ('1h'::text, interval '1 hour'),
        ('start'::text, interval '0')
    ) as r(kind, reminder_offset)
    where e.id = new.event_id
      and e.starts_at - r.reminder_offset > now()
    on conflict do nothing;
  end if;

  if tg_op = 'DELETE' or new.status = 'not_going' then
    delete from public.event_reminder_queue
    where event_id = coalesce(new.event_id, old.event_id)
      and user_id = coalesce(new.user_id, old.user_id);
  end if;

  return coalesce(new, old);
end;
$$;

-- Organizatör başarımlarında etkinlik adını kaynak olarak kullan
create or replace function public.on_event_organizer_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_going_count int;
begin
  if new.status = 'published' then
    perform public.award_achievement(new.organizer_id, 'first_event_created', new.title);

    select count(*) into v_going_count
    from public.event_rsvps
    where event_id = new.id and status = 'going';

    if v_going_count >= 50 then
      perform public.award_achievement(new.organizer_id, 'event_community_leader', new.title);
    end if;
  end if;
  return new;
end;
$$;

-- Görev ödülü başarımlarında görev adını kaynak olarak kullan (görev sistemi yüklüyse)
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
      perform public.adjust_trust_score(p_user_id, greatest(1, v_def.reward_value / 3));
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
      perform public.adjust_trust_score(p_user_id, greatest(1, v_def.reward_value / 5));
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

  return jsonb_build_object(
    'task_key', p_task_key,
    'reward_type', v_def.reward_type,
    'reward_value', v_def.reward_value
  );
end;
$$;
$claim$;
end $outer$;
