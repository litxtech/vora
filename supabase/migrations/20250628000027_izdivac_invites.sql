-- İzdivaç davetler + doğrudan sohbet bağlantıları

alter type public.notification_event_type add value if not exists 'izdivac_invite_received';
alter type public.notification_event_type add value if not exists 'izdivac_invite_accepted';

create type public.izdivac_invite_kind as enum ('space', 'meet', 'post_join', 'direct_chat');
create type public.izdivac_invite_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table if not exists public.izdivac_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  invite_kind public.izdivac_invite_kind not null,
  target_space_id uuid references public.izdivac_spaces (id) on delete cascade,
  target_post_id uuid references public.izdivac_posts (id) on delete cascade,
  message text,
  status public.izdivac_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint izdivac_invites_distinct_users check (inviter_id is distinct from invitee_id)
);

create index if not exists izdivac_invites_invitee_idx
  on public.izdivac_invites (invitee_id, status, created_at desc);

create index if not exists izdivac_invites_inviter_idx
  on public.izdivac_invites (inviter_id, created_at desc);

alter table public.izdivac_invites enable row level security;

create policy izdivac_invites_read on public.izdivac_invites
  for select to authenticated
  using (
    public.izdivac_has_access()
    and (inviter_id = auth.uid() or invitee_id = auth.uid())
  );

create or replace function public.izdivac_send_invite(
  p_invitee_id uuid,
  p_invite_kind public.izdivac_invite_kind default 'meet',
  p_message text default null,
  p_target_space_id uuid default null,
  p_target_post_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_invite_id uuid;
  v_body text := coalesce(nullif(trim(p_message), ''), 'İzdivaç daveti');
begin
  if not public.izdivac_has_access(v_me) then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  if p_invitee_id is null or p_invitee_id = v_me then
    raise exception 'Geçersiz davet alıcısı';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_invitee_id and p.izdivac_access_granted = true and p.account_status = 'active'
  ) then
    raise exception 'Kullanıcı İzdivaç üyesi değil';
  end if;

  if exists (
    select 1 from public.user_blocks ub
    where (ub.blocker_id = v_me and ub.blocked_id = p_invitee_id)
       or (ub.blocker_id = p_invitee_id and ub.blocked_id = v_me)
  ) then
    raise exception 'Engellenmiş kullanıcı';
  end if;

  insert into public.izdivac_invites (
    inviter_id, invitee_id, invite_kind, target_space_id, target_post_id, message
  )
  values (
    v_me, p_invitee_id, coalesce(p_invite_kind, 'meet'),
    p_target_space_id, p_target_post_id,
    nullif(trim(coalesce(p_message, '')), '')
  )
  returning id into v_invite_id;

  perform public.notify_profile_user(
    p_invitee_id,
    'izdivac_invite_received',
    'İzdivaç daveti',
    left(v_body, 120),
    jsonb_build_object(
      'kind', 'izdivac_invite_received',
      'invite_id', v_invite_id,
      'invite_kind', coalesce(p_invite_kind, 'meet')::text,
      'actor_id', v_me,
      'deep_link', '/izdivac-center?tab=invites',
      'action_hint', 'Davetleri gör'
    )
  );

  return v_invite_id;
end;
$$;

create or replace function public.izdivac_respond_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_invite public.izdivac_invites%rowtype;
  v_conversation_id uuid;
begin
  select * into v_invite
  from public.izdivac_invites
  where id = p_invite_id and invitee_id = v_me and status = 'pending'
  for update;

  if v_invite.id is null then
    raise exception 'Davet bulunamadı';
  end if;

  update public.izdivac_invites
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_invite_id;

  if not p_accept then
    return null;
  end if;

  if v_invite.target_space_id is not null then
    v_conversation_id := public.izdivac_join_space(v_invite.target_space_id);
  elsif v_invite.invite_kind = 'direct_chat' or v_invite.invite_kind = 'meet' then
    v_conversation_id := public.get_or_create_direct_conversation(v_invite.inviter_id);
    insert into public.izdivac_conversation_links (conversation_id, link_type, initiated_from)
    values (v_conversation_id, 'direct', 'invite')
    on conflict (conversation_id) do nothing;
  end if;

  perform public.notify_profile_user(
    v_invite.inviter_id,
    'izdivac_invite_accepted',
    'Davet kabul edildi',
    'İzdivaç davetiniz kabul edildi.',
    jsonb_build_object(
      'kind', 'izdivac_invite_accepted',
      'invite_id', p_invite_id,
      'conversation_id', v_conversation_id,
      'actor_id', v_me,
      'deep_link', case
        when v_conversation_id is not null then '/chat/' || v_conversation_id::text
        else '/izdivac-center?tab=invites'
      end,
      'action_hint', 'Sohbete git'
    )
  );

  return v_conversation_id;
end;
$$;

create or replace function public.izdivac_list_invites(p_direction text default 'incoming')
returns table (
  invite_id uuid,
  inviter_id uuid,
  invitee_id uuid,
  inviter_first_name text,
  invitee_first_name text,
  inviter_avatar_url text,
  invite_kind public.izdivac_invite_kind,
  message text,
  status public.izdivac_invite_status,
  target_space_id uuid,
  target_post_id uuid,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if not public.izdivac_has_access(v_me) then
    return;
  end if;

  return query
  select
    i.id,
    i.inviter_id,
    i.invitee_id,
    coalesce(nullif(trim(pi.first_name), ''), split_part(coalesce(pi.full_name, ''), ' ', 1)),
    coalesce(nullif(trim(pe.first_name), ''), split_part(coalesce(pe.full_name, ''), ' ', 1)),
    pi.avatar_url,
    i.invite_kind,
    i.message,
    i.status,
    i.target_space_id,
    i.target_post_id,
    i.created_at
  from public.izdivac_invites i
  inner join public.profiles pi on pi.id = i.inviter_id
  inner join public.profiles pe on pe.id = i.invitee_id
  where (
    (coalesce(p_direction, 'incoming') = 'incoming' and i.invitee_id = v_me)
    or (p_direction = 'outgoing' and i.inviter_id = v_me)
  )
  order by i.created_at desc
  limit 100;
end;
$$;

create or replace function public.izdivac_link_direct_conversation(
  p_conversation_id uuid,
  p_initiated_from public.izdivac_conversation_initiated_from default 'member_card'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.izdivac_has_access() then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = auth.uid()
  ) then
    raise exception 'Sohbet erişimi yok';
  end if;

  insert into public.izdivac_conversation_links (conversation_id, link_type, initiated_from)
  values (p_conversation_id, 'direct', coalesce(p_initiated_from, 'member_card'))
  on conflict (conversation_id) do nothing;
end;
$$;

create or replace function public.izdivac_start_direct_chat(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if not public.izdivac_has_access() then
    raise exception 'İzdivaç erişiminiz yok';
  end if;

  v_conversation_id := public.get_or_create_direct_conversation(p_other_user_id);

  perform public.izdivac_link_direct_conversation(v_conversation_id, 'member_card');

  return v_conversation_id;
end;
$$;

create or replace function public.izdivac_list_conversations()
returns table (
  conversation_id uuid,
  conversation_type public.conversation_type,
  title text,
  avatar_url text,
  last_message_at timestamptz,
  last_message_preview text,
  other_user_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_url text,
  unread_count bigint,
  member_count bigint,
  link_type public.izdivac_conversation_link_type,
  space_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.type,
    c.title,
    c.avatar_url,
    c.last_message_at,
    c.last_message_preview,
    other_p.id,
    other_p.username,
    other_p.full_name,
    other_p.avatar_url,
    coalesce((
      select count(*)::bigint
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id is distinct from auth.uid()
        and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
    ), 0),
    (select count(*)::bigint from public.conversation_members x where x.conversation_id = c.id),
    l.link_type,
    l.space_id
  from public.izdivac_conversation_links l
  inner join public.conversations c on c.id = l.conversation_id
  inner join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = auth.uid()
  left join lateral (
    select p.id, p.username, p.full_name, p.avatar_url
    from public.conversation_members ocm
    inner join public.profiles p on p.id = ocm.user_id
    where ocm.conversation_id = c.id
      and c.type = 'direct'
      and ocm.user_id is distinct from auth.uid()
    limit 1
  ) other_p on true
  where public.izdivac_has_access()
  order by c.last_message_at desc nulls last;
$$;

grant execute on function public.izdivac_send_invite(uuid, public.izdivac_invite_kind, text, uuid, uuid) to authenticated;
grant execute on function public.izdivac_respond_invite(uuid, boolean) to authenticated;
grant execute on function public.izdivac_list_invites(text) to authenticated;
grant execute on function public.izdivac_link_direct_conversation(uuid, public.izdivac_conversation_initiated_from) to authenticated;
grant execute on function public.izdivac_start_direct_chat(uuid) to authenticated;
grant execute on function public.izdivac_list_conversations() to authenticated;
