-- Bölüm 26 — Görev ve Ödül Sistemi

create type public.task_reward_type as enum ('points', 'badge', 'premium_days', 'achievement');

create table public.daily_task_definitions (
  key text primary key,
  title text not null,
  description text not null,
  target_count integer not null default 1,
  reward_type public.task_reward_type not null default 'points',
  reward_value integer not null default 0,
  reward_key text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.daily_task_definitions (key, title, description, target_count, reward_type, reward_value, reward_key, sort_order) values
  ('share_post', 'Gönderi Paylaş', 'Bugün bir gönderi paylaşın', 1, 'points', 15, null, 1),
  ('comment', 'Yorum Yap', 'Bugün bir gönderiye yorum yapın', 1, 'points', 10, null, 2),
  ('verify_news', 'Haber Doğrula', 'Bir haberi doğrulayın (muhabirler)', 1, 'points', 20, null, 3),
  ('join_event', 'Etkinliğe Katıl', 'Bir etkinliğe katılım bildirin', 1, 'points', 15, null, 4)
on conflict (key) do nothing;

create table public.user_daily_task_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_key text not null references public.daily_task_definitions (key) on delete cascade,
  task_date date not null default current_date,
  progress integer not null default 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, task_key, task_date)
);

create index user_daily_task_progress_date_idx
  on public.user_daily_task_progress (user_id, task_date desc);

-- Günlük görev ilerlemesi
create or replace function public.bump_daily_task(p_user_id uuid, p_task_key text, p_amount integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target integer;
  v_progress integer;
begin
  if p_user_id is null or p_task_key is null then
    return;
  end if;

  select target_count into v_target
  from public.daily_task_definitions
  where key = p_task_key and is_active = true;

  if not found then
    return;
  end if;

  insert into public.user_daily_task_progress (user_id, task_key, task_date, progress)
  values (p_user_id, p_task_key, current_date, least(p_amount, v_target))
  on conflict (user_id, task_key, task_date) do update
  set progress = least(
    public.user_daily_task_progress.progress + p_amount,
    v_target
  );

  select progress into v_progress
  from public.user_daily_task_progress
  where user_id = p_user_id and task_key = p_task_key and task_date = current_date;

  if v_progress >= v_target then
    update public.user_daily_task_progress
    set completed_at = coalesce(completed_at, now())
    where user_id = p_user_id and task_key = p_task_key and task_date = current_date;
  end if;
end;
$$;

-- Ödül talep et
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
    when 'badge' then
      if v_def.reward_key is not null then
        insert into public.user_badges (user_id, badge_type)
        values (p_user_id, v_def.reward_key::public.badge_type)
        on conflict do nothing;
      end if;
    when 'achievement' then
      if v_def.reward_key is not null then
        perform public.award_achievement(p_user_id, v_def.reward_key);
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

  -- Tüm görevler tamamlandıysa bonus
  if (
    select count(*) = (select count(*) from public.daily_task_definitions where is_active = true)
    from public.user_daily_task_progress p
    where p.user_id = p_user_id
      and p.task_date = p_task_date
      and p.claimed_at is not null
  ) then
    perform public.award_achievement(p_user_id, 'daily_tasks_complete');
    insert into public.premium_subscriptions (user_id, plan, status, starts_at, expires_at)
    values (p_user_id, 'monthly', 'active', now(), now() + interval '1 day');
    perform public.sync_premium_status(p_user_id);
  end if;

  return jsonb_build_object(
    'task_key', p_task_key,
    'reward_type', v_def.reward_type,
    'reward_value', v_def.reward_value
  );
end;
$$;

-- Kullanıcı günlük görev listesi
create or replace function public.get_user_daily_tasks(p_user_id uuid)
returns table (
  task_key text,
  title text,
  description text,
  target_count integer,
  progress integer,
  reward_type public.task_reward_type,
  reward_value integer,
  completed_at timestamptz,
  claimed_at timestamptz,
  sort_order integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    d.key,
    d.title,
    d.description,
    d.target_count,
    coalesce(p.progress, 0),
    d.reward_type,
    d.reward_value,
    p.completed_at,
    p.claimed_at,
    d.sort_order
  from public.daily_task_definitions d
  left join public.user_daily_task_progress p
    on p.task_key = d.key
    and p.user_id = p_user_id
    and p.task_date = current_date
  where d.is_active = true
  order by d.sort_order;
end;
$$;

-- Tetikleyiciler
create or replace function public.on_daily_task_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    perform public.bump_daily_task(new.author_id, 'share_post');
  end if;
  return new;
end;
$$;

drop trigger if exists daily_task_post on public.posts;
create trigger daily_task_post
  after insert on public.posts
  for each row execute function public.on_daily_task_post();

create or replace function public.on_daily_task_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bump_daily_task(new.author_id, 'comment');
  return new;
end;
$$;

drop trigger if exists daily_task_comment on public.post_comments;
create trigger daily_task_comment
  after insert on public.post_comments
  for each row execute function public.on_daily_task_comment();

create or replace function public.on_daily_task_news_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.result = 'correct' then
    perform public.bump_daily_task(new.reporter_id, 'verify_news');
  end if;
  return new;
end;
$$;

drop trigger if exists daily_task_news_verify on public.news_verifications;
create trigger daily_task_news_verify
  after insert on public.news_verifications
  for each row execute function public.on_daily_task_news_verify();

create or replace function public.on_daily_task_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'going' then
    perform public.bump_daily_task(new.user_id, 'join_event');
  end if;
  return new;
end;
$$;

drop trigger if exists daily_task_event_rsvp on public.event_rsvps;
create trigger daily_task_event_rsvp
  after insert on public.event_rsvps
  for each row execute function public.on_daily_task_event_rsvp();

alter table public.daily_task_definitions enable row level security;
alter table public.user_daily_task_progress enable row level security;

create policy "daily_task_definitions_read" on public.daily_task_definitions
  for select to authenticated using (true);

create policy "user_daily_task_progress_self_read" on public.user_daily_task_progress
  for select to authenticated using (user_id = auth.uid());

grant execute on function public.bump_daily_task(uuid, text, integer) to authenticated;
grant execute on function public.claim_daily_task_reward(uuid, text, date) to authenticated;
grant execute on function public.get_user_daily_tasks(uuid) to authenticated;
