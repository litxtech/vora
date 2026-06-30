-- Admin System Complete — appeals, center moderation RPCs, extended dashboard

-- ─── Enums ───────────────────────────────────────────────────────────────────

do $$ begin
  create type public.appeal_type as enum ('ban', 'content_removal', 'account_suspension', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.appeal_status as enum ('pending', 'reviewing', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- ─── Moderation appeals ──────────────────────────────────────────────────────

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  appeal_type public.appeal_type not null,
  reference_id uuid,
  reference_type text,
  reason text not null,
  status public.appeal_status not null default 'pending',
  assigned_to uuid references public.profiles (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists moderation_appeals_status_idx
  on public.moderation_appeals (status, created_at desc);

alter table public.moderation_appeals enable row level security;

create policy moderation_appeals_self_insert on public.moderation_appeals
  for insert to authenticated
  with check (user_id = auth.uid());

create policy moderation_appeals_self_read on public.moderation_appeals
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin', 'super_admin')
    )
  );

create policy moderation_appeals_mod_update on public.moderation_appeals
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin', 'super_admin')
    )
  );

-- ─── Scheduled broadcasts ──────────────────────────────────────────────────────

create table if not exists public.scheduled_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  broadcast_type public.broadcast_type not null default 'system',
  title text not null,
  body text not null,
  region_id text references public.regions (id),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  is_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists scheduled_broadcasts_pending_idx
  on public.scheduled_broadcasts (is_sent, scheduled_at)
  where is_sent = false;

alter table public.scheduled_broadcasts enable row level security;

create policy scheduled_broadcasts_admin on public.scheduled_broadcasts
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- ─── Platform moderation columns ─────────────────────────────────────────────

alter table public.communities
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles (id) on delete set null,
  add column if not exists suspend_reason text;

alter table public.channels
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles (id) on delete set null,
  add column if not exists suspend_reason text;

alter table public.volunteer_teams
  add column if not exists is_suspended boolean not null default false;

-- ─── Reporter applications list ──────────────────────────────────────────────

create or replace function public.admin_list_reporter_applications(
  p_status public.reporter_application_status default 'pending',
  p_limit int default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  motivation text,
  experience text,
  region_id text,
  status public.reporter_application_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    ra.id,
    ra.user_id,
    p.username,
    p.full_name,
    ra.motivation,
    ra.experience,
    ra.region_id,
    ra.status,
    ra.created_at
  from public.reporter_applications ra
  join public.profiles p on p.id = ra.user_id
  where (p_status is null or ra.status = p_status)
  order by ra.created_at desc
  limit p_limit;
end;
$$;

-- ─── News verifications list ─────────────────────────────────────────────────

create or replace function public.admin_list_news_verifications(p_limit int default 50)
returns table (
  id uuid,
  post_id uuid,
  reel_id uuid,
  reporter_id uuid,
  reporter_username text,
  result public.news_verification_result,
  note text,
  score_delta int,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    nv.id,
    nv.post_id,
    nv.reel_id,
    nv.reporter_id,
    p.username,
    nv.result,
    nv.note,
    nv.score_delta,
    nv.created_at
  from public.news_verifications nv
  join public.profiles p on p.id = nv.reporter_id
  order by nv.created_at desc
  limit p_limit;
end;
$$;

-- ─── Verification center (community voting) ──────────────────────────────────

create or replace function public.admin_list_post_verifications(
  p_status public.verification_status default null,
  p_limit int default 50
)
returns table (
  id uuid,
  post_id uuid,
  region_id text,
  status public.verification_status,
  verified_votes int,
  misinfo_votes int,
  reviewing_votes int,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    pv.id,
    pv.post_id,
    pv.region_id,
    pv.status,
    pv.verified_votes,
    pv.misinfo_votes,
    pv.reviewing_votes,
    pv.created_at
  from public.post_verifications pv
  where (p_status is null or pv.status = p_status)
  order by pv.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_set_post_verification_status(
  p_verification_id uuid,
  p_status public.verification_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.post_verifications
  set status = p_status, updated_at = now()
  where id = p_verification_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(), 'post_verification', p_verification_id, 'hide',
    'Admin doğrulama durumu güncellendi',
    jsonb_build_object('new_status', p_status)
  );
end;
$$;

-- ─── Communities ─────────────────────────────────────────────────────────────

create or replace function public.admin_list_communities(p_limit int default 50)
returns table (
  id uuid,
  name text,
  slug text,
  category text,
  region_id text,
  member_count int,
  post_count int,
  is_suspended boolean,
  created_by uuid,
  owner_username text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    c.id, c.name, c.slug, c.category, c.region_id,
    c.member_count, c.post_count, c.is_suspended,
    c.created_by, p.username, c.created_at
  from public.communities c
  join public.profiles p on p.id = c.created_by
  order by c.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_suspend_community(
  p_community_id uuid,
  p_suspend boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.communities
  set
    is_suspended = p_suspend,
    suspended_at = case when p_suspend then now() else null end,
    suspended_by = case when p_suspend then auth.uid() else null end,
    suspend_reason = case when p_suspend then p_reason else null end,
    updated_at = now()
  where id = p_community_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (
    auth.uid(), 'community', p_community_id,
    case when p_suspend then 'hide' else 'warn' end,
    coalesce(p_reason, case when p_suspend then 'Topluluk askıya alındı' else 'Topluluk askıdan çıkarıldı' end)
  );
end;
$$;

-- ─── Channels ────────────────────────────────────────────────────────────────

create or replace function public.admin_list_channels(p_limit int default 50)
returns table (
  id uuid,
  name text,
  slug text,
  channel_type public.channel_type,
  region_id text,
  subscriber_count int,
  is_verified boolean,
  is_suspended boolean,
  owner_id uuid,
  owner_username text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    ch.id, ch.name, ch.slug, ch.channel_type, ch.region_id,
    ch.subscriber_count, ch.is_verified, ch.is_suspended,
    ch.owner_id, p.username, ch.created_at
  from public.channels ch
  join public.profiles p on p.id = ch.owner_id
  order by ch.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_verify_channel(p_channel_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.channels set is_verified = p_verified, updated_at = now() where id = p_channel_id;
end;
$$;

create or replace function public.admin_suspend_channel(
  p_channel_id uuid,
  p_suspend boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.channels
  set
    is_suspended = p_suspend,
    suspended_at = case when p_suspend then now() else null end,
    suspended_by = case when p_suspend then auth.uid() else null end,
    suspend_reason = case when p_suspend then p_reason else null end,
    updated_at = now()
  where id = p_channel_id;
end;
$$;

-- ─── Business ads ────────────────────────────────────────────────────────────

create or replace function public.admin_list_business_ads(
  p_status public.ad_status default 'pending',
  p_limit int default 50
)
returns table (
  id uuid,
  title text,
  description text,
  ad_type public.ad_type,
  status public.ad_status,
  budget_cents int,
  impressions int,
  clicks int,
  owner_id uuid,
  owner_username text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    ba.id, ba.title, ba.description, ba.ad_type, ba.status,
    ba.budget_cents, ba.impressions, ba.clicks,
    ba.owner_id, p.username, ba.created_at
  from public.business_ads ba
  join public.profiles p on p.id = ba.owner_id
  where (p_status is null or ba.status = p_status)
  order by ba.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_review_business_ad(
  p_ad_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.business_ads
  set status = case when p_approve then 'active'::public.ad_status else 'ended'::public.ad_status end,
      updated_at = now()
  where id = p_ad_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (
    auth.uid(), 'business_ad', p_ad_id,
    case when p_approve then 'warn' else 'remove' end,
    coalesce(p_note, case when p_approve then 'Reklam onaylandı' else 'Reklam reddedildi' end)
  );
end;
$$;

-- ─── Premium subscriptions ─────────────────────────────────────────────────────

create or replace function public.admin_list_premium_subscriptions(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  plan text,
  status text,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  return query
  select
    ps.id, ps.user_id, p.username, p.full_name,
    ps.plan::text, ps.status::text, ps.starts_at, ps.expires_at, ps.created_at
  from public.premium_subscriptions ps
  join public.profiles p on p.id = ps.user_id
  order by ps.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_set_user_premium(
  p_user_id uuid,
  p_is_premium boolean,
  p_days int default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;

  if p_is_premium then
    insert into public.premium_subscriptions (user_id, plan, status, starts_at, expires_at)
    values (p_user_id, 'monthly', 'active', now(), now() + (p_days || ' days')::interval);
  else
    update public.premium_subscriptions
    set status = 'cancelled', expires_at = now()
    where user_id = p_user_id and status = 'active';
  end if;

  perform public.sync_premium_status(p_user_id);
end;
$$;

-- ─── Appeals ─────────────────────────────────────────────────────────────────

create or replace function public.admin_list_appeals(
  p_status public.appeal_status default 'pending',
  p_limit int default 50
)
returns table (
  id uuid,
  user_id uuid,
  username text,
  appeal_type public.appeal_type,
  reference_id uuid,
  reference_type text,
  reason text,
  status public.appeal_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select
    a.id, a.user_id, p.username, a.appeal_type,
    a.reference_id, a.reference_type, a.reason, a.status, a.created_at
  from public.moderation_appeals a
  join public.profiles p on p.id = a.user_id
  where (p_status is null or a.status = p_status)
  order by a.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_resolve_appeal(
  p_appeal_id uuid,
  p_status public.appeal_status,
  p_note text default null,
  p_lift_ban boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appeal public.moderation_appeals%rowtype;
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  select * into v_appeal from public.moderation_appeals where id = p_appeal_id;
  if not found then raise exception 'İtiraz bulunamadı'; end if;

  update public.moderation_appeals
  set status = p_status, resolved_by = auth.uid(), resolution_note = p_note, resolved_at = now()
  where id = p_appeal_id;

  if p_lift_ban and p_status = 'approved' and v_appeal.appeal_type = 'ban' then
    perform public.admin_lift_ban(v_appeal.user_id);
  end if;
end;
$$;

-- ─── VCTS ────────────────────────────────────────────────────────────────────

create or replace function public.admin_list_content_trust_records(p_limit int default 50)
returns table (
  id uuid,
  post_id uuid,
  trust_code text,
  publisher_key text,
  status public.vcts_trust_status,
  content_type public.vcts_content_type,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  return query
  select ctr.id, ctr.post_id, ctr.trust_code, ctr.publisher_key, ctr.status, ctr.content_type, ctr.created_at
  from public.content_trust_records ctr
  order by ctr.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_set_content_trust_status(
  p_record_id uuid,
  p_status public.vcts_trust_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.content_trust_records set status = p_status, updated_at = now() where id = p_record_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'content_trust', p_record_id, 'warn', 'VCTS durumu güncellendi', jsonb_build_object('status', p_status));
end;
$$;

-- ─── Center moderation RPCs ──────────────────────────────────────────────────

create or replace function public.admin_list_anonymous_tips(
  p_status public.tip_moderation_status default 'pending',
  p_limit int default 50
)
returns table (id uuid, region_id text, category public.tip_category, description text, moderation_status public.tip_moderation_status, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select t.id, t.region_id, t.category, t.description, t.moderation_status, t.created_at
  from public.anonymous_tips t where (p_status is null or t.moderation_status = p_status)
  order by t.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_moderate_anonymous_tip(p_tip_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.anonymous_tips set moderation_status = case when p_approve then 'approved' else 'rejected' end where id = p_tip_id;
end; $$;

create or replace function public.admin_list_polls(p_limit int default 50)
returns table (id uuid, question text, region_id text, is_active boolean, total_votes int, author_username text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select po.id, po.question, po.region_id, po.is_active, po.total_votes, p.username, po.created_at
  from public.polls po join public.profiles p on p.id = po.author_id order by po.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_deactivate_poll(p_poll_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.polls set is_active = false where id = p_poll_id;
end; $$;

create or replace function public.admin_list_tv_videos(p_limit int default 50)
returns table (id uuid, title text, category public.tv_video_category, region_id text, is_featured boolean, view_count int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select v.id, v.title, v.category, v.region_id, v.is_featured, v.view_count, v.created_at
  from public.tv_videos v order by v.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_set_tv_video_featured(p_video_id uuid, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.tv_videos set is_featured = p_featured where id = p_video_id;
end; $$;

create or replace function public.admin_remove_tv_video(p_video_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.tv_videos where id = p_video_id;
end; $$;

create or replace function public.admin_list_traffic_reports(p_limit int default 50)
returns table (id uuid, title text, report_type public.traffic_report_type, region_id text, is_active boolean, confirm_count int, author_username text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select tr.id, tr.title, tr.report_type, tr.region_id, tr.is_active, tr.confirm_count, p.username, tr.created_at
  from public.traffic_reports tr join public.profiles p on p.id = tr.author_id order by tr.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_deactivate_traffic_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.traffic_reports set is_active = false where id = p_report_id;
end; $$;

create or replace function public.admin_list_help_requests(p_limit int default 50)
returns table (id uuid, title text, category public.help_request_category, urgency public.help_urgency, region_id text, is_resolved boolean, author_username text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select hr.id, hr.title, hr.category, hr.urgency, hr.region_id, hr.is_resolved, p.username, hr.created_at
  from public.help_requests hr join public.profiles p on p.id = hr.author_id order by hr.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_resolve_help_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.help_requests set is_resolved = true where id = p_request_id;
end; $$;

create or replace function public.admin_list_local_deals(p_limit int default 50)
returns table (id uuid, title text, deal_type public.deal_type, region_id text, is_active boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select d.id, d.title, d.deal_type, d.region_id, d.is_active, d.created_at
  from public.local_deals d order by d.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_deactivate_local_deal(p_deal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.local_deals set is_active = false where id = p_deal_id;
end; $$;

create or replace function public.admin_list_daily_summaries(p_limit int default 50)
returns table (id uuid, region_id text, summary_date date, summary_text text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select ds.id, ds.region_id, ds.summary_date, ds.summary_text, ds.created_at
  from public.daily_city_summaries ds order by ds.summary_date desc limit p_limit;
end; $$;

create or replace function public.admin_list_volunteer_teams(p_limit int default 50)
returns table (id uuid, name text, category text, region_id text, member_count int, is_active boolean, is_suspended boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query select vt.id, vt.name, vt.category::text, vt.region_id, vt.member_count, vt.is_active, vt.is_suspended, vt.created_at
  from public.volunteer_teams vt order by vt.created_at desc limit p_limit;
end; $$;

create or replace function public.admin_suspend_volunteer_team(p_team_id uuid, p_suspend boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.volunteer_teams set is_suspended = p_suspend where id = p_team_id;
end; $$;

-- ─── Messaging reports ───────────────────────────────────────────────────────

create or replace function public.admin_list_messaging_reports(p_limit int default 50)
returns table (
  id uuid,
  reporter_id uuid,
  reporter_username text,
  target_type text,
  target_id uuid,
  reason public.report_reason,
  status public.report_queue_status,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select cr.id, cr.reporter_id, p.username, cr.target_type, cr.target_id, cr.reason, cr.status, cr.created_at
  from public.content_reports cr
  join public.profiles p on p.id = cr.reporter_id
  where cr.target_type in ('message', 'conversation', 'call')
  order by cr.created_at desc limit p_limit;
end; $$;

-- ─── Vora Studio jobs ────────────────────────────────────────────────────────

create or replace function public.admin_list_vora_studio_jobs(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select j.id, j.user_id, p.username, j.status::text, j.created_at, j.updated_at
  from public.vora_studio_jobs j
  join public.profiles p on p.id = j.user_id
  order by j.created_at desc limit p_limit;
end; $$;

-- ─── Scheduled broadcasts ──────────────────────────────────────────────────────

create or replace function public.admin_list_scheduled_broadcasts(p_limit int default 50)
returns table (
  id uuid,
  title text,
  body text,
  broadcast_type public.broadcast_type,
  region_id text,
  scheduled_at timestamptz,
  is_sent boolean,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select sb.id, sb.title, sb.body, sb.broadcast_type, sb.region_id, sb.scheduled_at, sb.is_sent, sb.created_at
  from public.scheduled_broadcasts sb
  order by sb.scheduled_at desc limit p_limit;
end; $$;

create or replace function public.admin_create_scheduled_broadcast(
  p_title text,
  p_body text,
  p_broadcast_type public.broadcast_type,
  p_scheduled_at timestamptz,
  p_region_id text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  insert into public.scheduled_broadcasts (created_by, title, body, broadcast_type, scheduled_at, region_id)
  values (auth.uid(), p_title, p_body, p_broadcast_type, p_scheduled_at, p_region_id)
  returning id into v_id;
  return v_id;
end; $$;

-- ─── Moderator workload ──────────────────────────────────────────────────────

create or replace function public.admin_moderator_workload()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    from (
      select p.id, p.username, p.full_name,
        (select count(*)::int from public.content_reports cr where cr.assigned_to = p.id and cr.status in ('pending','reviewing')) as assigned_reports,
        (select count(*)::int from public.moderation_actions ma where ma.moderator_id = p.id and ma.created_at > now() - interval '7 days') as actions_7d
      from public.profiles p
      where p.role in ('moderator', 'admin', 'super_admin')
      order by assigned_reports desc
    ) t
  );
end; $$;

-- ─── Center stats ────────────────────────────────────────────────────────────

create or replace function public.admin_center_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return jsonb_build_object(
    'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
    'active_polls', (select count(*)::int from public.polls where is_active = true),
    'tv_videos', (select count(*)::int from public.tv_videos),
    'active_traffic', (select count(*)::int from public.traffic_reports where is_active = true),
    'open_help', (select count(*)::int from public.help_requests where is_resolved = false),
    'active_deals', (select count(*)::int from public.local_deals where is_active = true),
    'volunteer_teams', (select count(*)::int from public.volunteer_teams where is_active = true and is_suspended = false)
  );
end; $$;

-- ─── Extended dashboard stats ──────────────────────────────────────────────────

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_today timestamptz := date_trunc('day', now());
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  select jsonb_build_object(
    'total_users', (select count(*)::int from public.profiles),
    'active_users', (
      select count(*)::int from public.profiles
      where account_status = 'active'
        and coalesce(last_seen_at, updated_at) > now() - interval '7 days'
    ),
    'daily_registrations', (select count(*)::int from public.profiles where created_at >= v_today),
    'daily_posts', (select count(*)::int from public.posts where created_at >= v_today),
    'daily_comments', (select count(*)::int from public.post_comments where created_at >= v_today),
    'daily_messages', (select count(*)::int from public.messages where created_at >= v_today),
    'pending_reports', (select count(*)::int from public.content_reports where status = 'pending'),
    'pending_verifications', (select count(*)::int from public.businesses where registration_status = 'pending'),
    'pending_reporter_apps', (select count(*)::int from public.reporter_applications where status = 'pending'),
    'pending_ads', (select count(*)::int from public.business_ads where status = 'pending'),
    'pending_appeals', (select count(*)::int from public.moderation_appeals where status = 'pending'),
    'pending_tips', (select count(*)::int from public.anonymous_tips where moderation_status = 'pending'),
    'disputed_vcts', (select count(*)::int from public.content_trust_records where status = 'disputed'),
    'pending_post_verifications', (select count(*)::int from public.post_verifications where status = 'reviewing')
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_list_reporter_applications to authenticated;
grant execute on function public.admin_list_news_verifications to authenticated;
grant execute on function public.admin_list_post_verifications to authenticated;
grant execute on function public.admin_set_post_verification_status to authenticated;
grant execute on function public.admin_list_communities to authenticated;
grant execute on function public.admin_suspend_community to authenticated;
grant execute on function public.admin_list_channels to authenticated;
grant execute on function public.admin_verify_channel to authenticated;
grant execute on function public.admin_suspend_channel to authenticated;
grant execute on function public.admin_list_business_ads to authenticated;
grant execute on function public.admin_review_business_ad to authenticated;
grant execute on function public.admin_list_premium_subscriptions to authenticated;
grant execute on function public.admin_set_user_premium to authenticated;
grant execute on function public.admin_list_appeals to authenticated;
grant execute on function public.admin_resolve_appeal to authenticated;
grant execute on function public.admin_list_content_trust_records to authenticated;
grant execute on function public.admin_set_content_trust_status to authenticated;
grant execute on function public.admin_list_anonymous_tips to authenticated;
grant execute on function public.admin_moderate_anonymous_tip to authenticated;
grant execute on function public.admin_list_polls to authenticated;
grant execute on function public.admin_deactivate_poll to authenticated;
grant execute on function public.admin_list_tv_videos to authenticated;
grant execute on function public.admin_set_tv_video_featured to authenticated;
grant execute on function public.admin_remove_tv_video to authenticated;
grant execute on function public.admin_list_traffic_reports to authenticated;
grant execute on function public.admin_deactivate_traffic_report to authenticated;
grant execute on function public.admin_list_help_requests to authenticated;
grant execute on function public.admin_resolve_help_request to authenticated;
grant execute on function public.admin_list_local_deals to authenticated;
grant execute on function public.admin_deactivate_local_deal to authenticated;
grant execute on function public.admin_list_daily_summaries to authenticated;
grant execute on function public.admin_list_volunteer_teams to authenticated;
grant execute on function public.admin_suspend_volunteer_team to authenticated;
grant execute on function public.admin_list_messaging_reports to authenticated;
grant execute on function public.admin_list_vora_studio_jobs to authenticated;
grant execute on function public.admin_list_scheduled_broadcasts to authenticated;
grant execute on function public.admin_create_scheduled_broadcast to authenticated;
grant execute on function public.admin_moderator_workload to authenticated;
grant execute on function public.admin_center_stats to authenticated;
