-- Merkez moderasyonu: işlem doğrulama + ihbar onay/red kaydı

create or replace function public.admin_moderate_anonymous_tip(p_tip_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  update public.anonymous_tips
  set moderation_status = case
    when p_approve then 'approved'::public.tip_moderation_status
    else 'rejected'::public.tip_moderation_status
  end
  where id = p_tip_id
    and moderation_status = 'pending'::public.tip_moderation_status;

  if not found then
    raise exception 'İhbar bulunamadı veya zaten işlenmiş.';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (
    auth.uid(),
    'anonymous_tip',
    p_tip_id,
    case when p_approve then 'warn' else 'remove' end,
    case when p_approve then 'İhbar onaylandı' else 'İhbar reddedildi' end
  );
end;
$$;

create or replace function public.admin_deactivate_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.polls
  set is_active = false
  where id = p_poll_id and is_active = true;

  if not found then
    raise exception 'Anket bulunamadı veya zaten kapalı.';
  end if;
end;
$$;

create or replace function public.admin_deactivate_traffic_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.traffic_reports
  set is_active = false
  where id = p_report_id and is_active = true;

  if not found then
    raise exception 'Trafik bildirimi bulunamadı veya zaten kapalı.';
  end if;
end;
$$;

create or replace function public.admin_resolve_help_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.help_requests
  set is_resolved = true
  where id = p_request_id and is_resolved = false;

  if not found then
    raise exception 'Yardım talebi bulunamadı veya zaten çözüldü.';
  end if;
end;
$$;

create or replace function public.admin_deactivate_local_deal(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.local_deals
  set is_active = false
  where id = p_deal_id and is_active = true;

  if not found then
    raise exception 'Fırsat bulunamadı veya zaten kapalı.';
  end if;
end;
$$;

create or replace function public.admin_remove_tv_video(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  delete from public.tv_videos where id = p_video_id;

  if not found then
    raise exception 'Video bulunamadı.';
  end if;
end;
$$;

create or replace function public.admin_suspend_volunteer_team(p_team_id uuid, p_suspend boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.volunteer_teams
  set is_suspended = p_suspend
  where id = p_team_id and is_suspended is distinct from p_suspend;

  if not found then
    raise exception 'Gönüllü ekibi bulunamadı veya durum zaten güncel.';
  end if;
end;
$$;

-- Onaylanmış ihbarlar harita/merkezde okunabilsin
drop policy if exists anonymous_tips_approved_read on public.anonymous_tips;
create policy anonymous_tips_approved_read on public.anonymous_tips
  for select
  using (moderation_status = 'approved'::public.tip_moderation_status);

grant execute on function public.admin_moderate_anonymous_tip(uuid, boolean) to authenticated;
