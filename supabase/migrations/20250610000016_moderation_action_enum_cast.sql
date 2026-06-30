-- moderation_actions.action enum cast düzeltmesi (CASE ifadesi text döndürüyordu)

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
    (case when p_approve then 'warn' else 'remove' end)::public.moderation_action_type,
    case when p_approve then 'İhbar onaylandı' else 'İhbar reddedildi' end
  );
end;
$$;

create or replace function public.admin_lock_conversation(p_conversation_id uuid, p_lock boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  update public.conversations
  set admin_locked = p_lock, admin_lock_reason = case when p_lock then p_reason else null end, updated_at = now()
  where id = p_conversation_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (
    auth.uid(),
    'conversation',
    p_conversation_id,
    (case when p_lock then 'hide' else 'warn' end)::public.moderation_action_type,
    coalesce(p_reason, 'Admin sohbet kilidi')
  );
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
    auth.uid(),
    'community',
    p_community_id,
    (case when p_suspend then 'hide' else 'warn' end)::public.moderation_action_type,
    coalesce(p_reason, case when p_suspend then 'Topluluk askıya alındı' else 'Topluluk askıdan çıkarıldı' end)
  );
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
    auth.uid(),
    'business_ad',
    p_ad_id,
    (case when p_approve then 'warn' else 'remove' end)::public.moderation_action_type,
    coalesce(p_note, case when p_approve then 'Reklam onaylandı' else 'Reklam reddedildi' end)
  );
end;
$$;

grant execute on function public.admin_moderate_anonymous_tip(uuid, boolean) to authenticated;
grant execute on function public.admin_lock_conversation(uuid, boolean, text) to authenticated;
grant execute on function public.admin_suspend_community(uuid, boolean, text) to authenticated;
grant execute on function public.admin_review_business_ad(uuid, boolean, text) to authenticated;
