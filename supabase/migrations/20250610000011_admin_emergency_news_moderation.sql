-- Acil durum kilidi, haber doğrulama takibi ve kullanıcı aktivite zaman çizelgesi

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'frozen', 'deletion_pending', 'deleted', 'quarantined'));

alter table public.profiles
  add column if not exists quarantine_reason text,
  add column if not exists quarantined_at timestamptz,
  add column if not exists quarantined_by uuid references public.profiles (id) on delete set null;

create table if not exists public.account_quarantine_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_type text not null check (content_type in ('post', 'reel')),
  content_id uuid not null,
  previous_status text not null,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create index if not exists account_quarantine_snapshots_user_idx
  on public.account_quarantine_snapshots (user_id, created_at desc);

alter table public.account_quarantine_snapshots enable row level security;

create policy account_quarantine_snapshots_moderator_read
  on public.account_quarantine_snapshots
  for select to authenticated
  using (public.is_moderator());

-- Tüm oturumları sonlandır
create or replace function public.admin_revoke_all_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  delete from public.user_sessions where user_id = p_user_id;
end;
$$;

-- Kullanıcının tüm yayın içeriklerini kaldır
create or replace function public.admin_remove_all_user_content(
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posts int := 0;
  v_reels int := 0;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  update public.posts
  set status = 'removed', updated_at = now()
  where author_id = p_user_id and status in ('published', 'hidden');

  get diagnostics v_posts = row_count;

  update public.reels
  set status = 'removed', updated_at = now()
  where author_id = p_user_id and status in ('published', 'hidden');

  get diagnostics v_reels = row_count;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    'user',
    p_user_id,
    'remove',
    coalesce(p_reason, 'Tüm içerikler admin tarafından kaldırıldı'),
    jsonb_build_object('posts_removed', v_posts, 'reels_removed', v_reels)
  );

  return jsonb_build_object('posts_removed', v_posts, 'reels_removed', v_reels);
end;
$$;

-- Acil durum: içerikleri kaldır + hesabı kilitle + oturumları sonlandır
create or replace function public.admin_emergency_quarantine_user(
  p_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.posts%rowtype;
  v_reel public.reels%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Acil durum gerekçesi zorunlu';
  end if;

  for v_post in
    select * from public.posts
    where author_id = p_user_id and status in ('published', 'hidden')
  loop
    insert into public.account_quarantine_snapshots (user_id, content_type, content_id, previous_status)
    values (p_user_id, 'post', v_post.id, v_post.status::text);

    update public.posts
    set status = 'removed', updated_at = now()
    where id = v_post.id;
  end loop;

  for v_reel in
    select * from public.reels
    where author_id = p_user_id and status in ('published', 'hidden')
  loop
    insert into public.account_quarantine_snapshots (user_id, content_type, content_id, previous_status)
    values (p_user_id, 'reel', v_reel.id, v_reel.status::text);

    update public.reels
    set status = 'removed', updated_at = now()
    where id = v_reel.id;
  end loop;

  update public.profiles
  set
    account_status = 'quarantined',
    quarantine_reason = p_reason,
    quarantined_at = now(),
    quarantined_by = auth.uid(),
    updated_at = now()
  where id = p_user_id;

  delete from public.user_sessions where user_id = p_user_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    'user',
    p_user_id,
    'ban',
    p_reason,
    jsonb_build_object('type', 'emergency_quarantine')
  );
end;
$$;

-- İnceleme sonrası hesabı tekrar aktif et ve içerikleri geri yükle
create or replace function public.admin_release_quarantine_user(
  p_user_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snap public.account_quarantine_snapshots%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz';
  end if;

  for v_snap in
    select *
    from public.account_quarantine_snapshots
    where user_id = p_user_id and released_at is null
    order by created_at asc
  loop
    if v_snap.content_type = 'post' then
      update public.posts
      set status = v_snap.previous_status::public.content_status, updated_at = now()
      where id = v_snap.content_id and status = 'removed';
    else
      update public.reels
      set status = v_snap.previous_status::public.content_status, updated_at = now()
      where id = v_snap.content_id and status = 'removed';
    end if;

    update public.account_quarantine_snapshots
    set released_at = now()
    where id = v_snap.id;
  end loop;

  update public.profiles
  set
    account_status = 'active',
    quarantine_reason = null,
    quarantined_at = null,
    quarantined_by = null,
    updated_at = now()
  where id = p_user_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    'user',
    p_user_id,
    'warn',
    coalesce(p_note, 'Acil durum kilidi kaldırıldı, hesap tekrar aktif'),
    jsonb_build_object('type', 'quarantine_release')
  );
end;
$$;

-- Haber doğrulama kayıtları: içerik sahibi ve özet bilgiler
drop function if exists public.admin_list_news_verifications(int);

create or replace function public.admin_list_news_verifications(p_limit int default 50)
returns table (
  id uuid,
  post_id uuid,
  reel_id uuid,
  reporter_id uuid,
  reporter_username text,
  author_id uuid,
  author_username text,
  content_type text,
  content_snippet text,
  result public.news_verification_result,
  note text,
  score_delta int,
  content_correct_count int,
  content_incorrect_count int,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select
    nv.id,
    nv.post_id,
    nv.reel_id,
    nv.reporter_id,
    rp.username as reporter_username,
    coalesce(po.author_id, re.author_id) as author_id,
    ap.username as author_username,
    case when nv.post_id is not null then 'post' else 'reel' end as content_type,
    coalesce(left(po.content, 120), left(re.caption, 120), left(po.title, 120), '—') as content_snippet,
    nv.result,
    nv.note,
    nv.score_delta,
    coalesce((
      select count(*)::int
      from public.news_verifications nv2
      where nv2.result = 'correct'
        and (
          (nv.post_id is not null and nv2.post_id = nv.post_id)
          or (nv.reel_id is not null and nv2.reel_id = nv.reel_id)
        )
    ), 0) as content_correct_count,
    coalesce((
      select count(*)::int
      from public.news_verifications nv3
      where nv3.result = 'incorrect'
        and (
          (nv.post_id is not null and nv3.post_id = nv.post_id)
          or (nv.reel_id is not null and nv3.reel_id = nv.reel_id)
        )
    ), 0) as content_incorrect_count,
    nv.created_at
  from public.news_verifications nv
  join public.profiles rp on rp.id = nv.reporter_id
  left join public.posts po on po.id = nv.post_id
  left join public.reels re on re.id = nv.reel_id
  left join public.profiles ap on ap.id = coalesce(po.author_id, re.author_id)
  order by nv.created_at desc
  limit p_limit;
end;
$$;

-- En çok yanlış/doğru haber alan içerik sahipleri
create or replace function public.admin_list_news_verification_owners(p_limit int default 20)
returns table (
  author_id uuid,
  author_username text,
  correct_count int,
  incorrect_count int,
  total_verifications int,
  last_verification_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  with owner_stats as (
    select
      coalesce(po.author_id, re.author_id) as owner_id,
      nv.result,
      nv.created_at
    from public.news_verifications nv
    left join public.posts po on po.id = nv.post_id
    left join public.reels re on re.id = nv.reel_id
    where coalesce(po.author_id, re.author_id) is not null
  )
  select
    os.owner_id as author_id,
    p.username as author_username,
    count(*) filter (where os.result = 'correct')::int as correct_count,
    count(*) filter (where os.result = 'incorrect')::int as incorrect_count,
    count(*)::int as total_verifications,
    max(os.created_at) as last_verification_at
  from owner_stats os
  join public.profiles p on p.id = os.owner_id
  group by os.owner_id, p.username
  order by incorrect_count desc, correct_count desc, last_verification_at desc
  limit p_limit;
end;
$$;

-- Kullanıcı aktivite zaman çizelgesi
create or replace function public.admin_get_user_activity_timeline(
  p_user_id uuid,
  p_limit int default 60
)
returns table (
  event_type text,
  title text,
  detail text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return query
  select * from (
    select
      'post_published'::text,
      'Gönderi paylaştı'::text,
      left(coalesce(p.title, p.content, ''), 160),
      jsonb_build_object('post_id', p.id, 'status', p.status),
      p.created_at
    from public.posts p
    where p.author_id = p_user_id

    union all

    select
      'reel_published'::text,
      'Reel paylaştı'::text,
      left(coalesce(r.caption, ''), 160),
      jsonb_build_object('reel_id', r.id, 'status', r.status),
      r.created_at
    from public.reels r
    where r.author_id = p_user_id

    union all

    select
      'content_removed'::text,
      case p.status when 'removed' then 'Gönderi kaldırıldı' else 'Gönderi gizlendi' end,
      left(coalesce(p.title, p.content, ''), 160),
      jsonb_build_object('post_id', p.id, 'status', p.status),
      p.updated_at
    from public.posts p
    where p.author_id = p_user_id and p.status in ('removed', 'hidden')

    union all

    select
      'content_removed'::text,
      case r.status when 'removed' then 'Reel kaldırıldı' else 'Reel gizlendi' end,
      left(coalesce(r.caption, ''), 160),
      jsonb_build_object('reel_id', r.id, 'status', r.status),
      r.updated_at
    from public.reels r
    where r.author_id = p_user_id and r.status in ('removed', 'hidden')

    union all

    select
      'news_verification'::text,
      'Haber doğrulama: ' || nv.result::text,
      coalesce(nv.note, ''),
      jsonb_build_object('verification_id', nv.id, 'result', nv.result),
      nv.created_at
    from public.news_verifications nv
    where nv.reporter_id = p_user_id

    union all

    select
      'ban'::text,
      'Hesap banlandı'::text,
      coalesce(ub.reason, ''),
      jsonb_build_object('duration', ub.duration, 'expires_at', ub.expires_at),
      ub.created_at
    from public.user_bans ub
    where ub.user_id = p_user_id

    union all

    select
      'warning'::text,
      'Uyarı: ' || w.level::text,
      coalesce(w.reason, ''),
      jsonb_build_object('warning_id', w.id, 'level', w.level),
      w.created_at
    from public.user_warnings w
    where w.user_id = p_user_id

    union all

    select
      'report_sent'::text,
      'Şikayet gönderdi'::text,
      coalesce(cr.reason::text, ''),
      jsonb_build_object('report_id', cr.id, 'target_type', cr.target_type),
      cr.created_at
    from public.content_reports cr
    where cr.reporter_id = p_user_id

    union all

    select
      ma.action::text,
      'Moderasyon: ' || ma.action::text,
      coalesce(ma.reason, ''),
      coalesce(ma.metadata, '{}'::jsonb),
      ma.created_at
    from public.moderation_actions ma
    where ma.target_id = p_user_id and ma.target_type = 'user'

    union all

    select
      'quarantine'::text,
      'Acil durum kilidi'::text,
      coalesce(pr.quarantine_reason, ''),
      jsonb_build_object('quarantined_at', pr.quarantined_at),
      pr.quarantined_at
    from public.profiles pr
    where pr.id = p_user_id and pr.account_status = 'quarantined' and pr.quarantined_at is not null
  ) timeline
  order by created_at desc
  limit greatest(1, least(p_limit, 120));
end;
$$;

grant execute on function public.admin_revoke_all_user_sessions(uuid) to authenticated;
grant execute on function public.admin_remove_all_user_content(uuid, text) to authenticated;
grant execute on function public.admin_emergency_quarantine_user(uuid, text) to authenticated;
grant execute on function public.admin_release_quarantine_user(uuid, text) to authenticated;
grant execute on function public.admin_list_news_verifications(int) to authenticated;
grant execute on function public.admin_list_news_verification_owners(int) to authenticated;
grant execute on function public.admin_get_user_activity_timeline(uuid, int) to authenticated;
