-- Admin eksik özellikler: personel, kampanya, haber doğrulama, arama, gündem, boost, block/mute

-- ─── Personel arayan ilanları ────────────────────────────────────────────────

create or replace function public.admin_list_staff_requests(p_limit int default 50)
returns table (
  id uuid,
  title text,
  description text,
  region_id text,
  job_type text,
  status public.content_status,
  author_username text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select sr.id, sr.title, sr.description, sr.region_id, sr.job_type::text, sr.status,
         p.username, sr.created_at
  from public.staff_requests sr
  join public.profiles p on p.id = sr.author_id
  order by sr.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_update_staff_request_status(
  p_id uuid,
  p_status public.content_status
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.staff_requests set status = p_status where id = p_id;
end;
$$;

-- ─── İş arayan profilleri ──────────────────────────────────────────────────────

create or replace function public.admin_list_job_seekers(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  username text,
  title text,
  occupation text,
  region_id text,
  is_ready boolean,
  is_visible_on_map boolean,
  status public.content_status,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select js.id, js.user_id, p.username, js.title, js.occupation, js.region_id,
         js.is_ready, js.is_visible_on_map, js.status, js.created_at
  from public.job_seekers js
  join public.profiles p on p.id = js.user_id
  order by js.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_update_job_seeker_status(
  p_id uuid,
  p_status public.content_status
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.job_seekers set status = p_status where id = p_id;
end;
$$;

-- ─── Kurumsal kampanyalar ──────────────────────────────────────────────────────

create or replace function public.admin_list_business_campaigns(p_limit int default 50)
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  owner_username text,
  title text,
  description text,
  status public.content_status,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select bc.id, bc.business_id, b.name, p.username, bc.title, bc.description,
         bc.status, bc.starts_at, bc.ends_at, bc.created_at
  from public.business_campaigns bc
  join public.businesses b on b.id = bc.business_id
  join public.profiles p on p.id = b.owner_id
  order by bc.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_moderate_business_campaign(
  p_id uuid,
  p_status public.content_status
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.business_campaigns set status = p_status where id = p_id;
end;
$$;

-- ─── Haber doğrulama moderasyonu ───────────────────────────────────────────────

create or replace function public.admin_override_news_verification(
  p_id uuid,
  p_result public.news_verification_result,
  p_note text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.news_verifications
  set result = p_result,
      note = coalesce(p_note, note),
      score_delta = case p_result
        when 'correct' then 5
        when 'incorrect' then -10
        else 0
      end
  where id = p_id;
end;
$$;

create or replace function public.admin_remove_news_verification(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.news_verifications where id = p_id;
end;
$$;

-- ─── Arama moderasyonu ─────────────────────────────────────────────────────────

create or replace function public.admin_list_call_sessions(p_limit int default 50)
returns table (
  id uuid,
  caller_username text,
  callee_username text,
  call_type text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select cs.id, cp.username, cep.username, cs.call_type::text, cs.status::text,
         cs.started_at, cs.ended_at, cs.created_at
  from public.call_sessions cs
  join public.profiles cp on cp.id = cs.caller_id
  join public.profiles cep on cep.id = cs.callee_id
  order by cs.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_terminate_call_session(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  update public.call_sessions
  set status = 'ended', ended_at = now()
  where id = p_id and status in ('ringing', 'accepted');
end;
$$;

-- ─── Gündem yönetimi ───────────────────────────────────────────────────────────

create or replace function public.admin_list_daily_agenda(p_limit int default 50)
returns table (
  id uuid,
  tag text,
  label text,
  region_id text,
  scope text,
  priority int,
  agenda_date date,
  is_manual boolean,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select da.id, da.tag, da.label, da.region_id, da.scope, da.priority,
         da.agenda_date, da.is_manual, da.created_at
  from public.daily_agenda da
  order by da.agenda_date desc, da.priority desc
  limit p_limit;
end;
$$;

create or replace function public.admin_upsert_daily_agenda(
  p_id uuid default null,
  p_tag text default null,
  p_label text default null,
  p_region_id text default null,
  p_scope text default 'region',
  p_priority int default 0
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  if p_id is not null then
    update public.daily_agenda
    set tag = coalesce(p_tag, tag),
        label = coalesce(p_label, label),
        region_id = p_region_id,
        scope = coalesce(p_scope, scope),
        priority = coalesce(p_priority, priority)
    where id = p_id
    returning id into v_id;
    return v_id;
  end if;
  insert into public.daily_agenda (tag, label, region_id, scope, priority, is_manual)
  values (p_tag, p_label, p_region_id, p_scope, p_priority, true)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_delete_daily_agenda(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.daily_agenda where id = p_id;
end;
$$;

-- ─── Profil boost ─────────────────────────────────────────────────────────────

create or replace function public.admin_list_profile_boosts(p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  profile_boosted_until timestamptz,
  is_premium boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query
  select p.id, p.username, p.profile_boosted_until, p.is_premium
  from public.profiles p
  where p.profile_boosted_until is not null
     or p.is_premium = true
  order by p.profile_boosted_until desc nulls last
  limit p_limit;
end;
$$;

create or replace function public.admin_revoke_profile_boost(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.profiles set profile_boosted_until = null where id = p_user_id;
end;
$$;

create or replace function public.admin_grant_profile_boost(p_user_id uuid, p_days int default 7)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.profiles
  set profile_boosted_until = greatest(
    coalesce(profile_boosted_until, now()),
    now()
  ) + (p_days || ' days')::interval
  where id = p_user_id;
end;
$$;

-- ─── Engelleme & sessize alma ──────────────────────────────────────────────────

create or replace function public.admin_list_user_blocks(p_limit int default 50)
returns table (
  blocker_id uuid,
  blocker_username text,
  blocked_id uuid,
  blocked_username text,
  is_restricted boolean,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select ub.blocker_id, bp.username, ub.blocked_id, blp.username,
         ub.is_restricted, ub.created_at
  from public.user_blocks ub
  join public.profiles bp on bp.id = ub.blocker_id
  join public.profiles blp on blp.id = ub.blocked_id
  order by ub.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_list_user_mutes(p_limit int default 50)
returns table (
  muter_id uuid,
  muter_username text,
  muted_id uuid,
  muted_username text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  return query
  select um.muter_id, mp.username, um.muted_id, mdp.username, um.created_at
  from public.user_mutes um
  join public.profiles mp on mp.id = um.muter_id
  join public.profiles mdp on mdp.id = um.muted_id
  order by um.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.admin_remove_user_block(p_blocker_id uuid, p_blocked_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.user_blocks
  where blocker_id = p_blocker_id and blocked_id = p_blocked_id;
end;
$$;

create or replace function public.admin_remove_user_mute(p_muter_id uuid, p_muted_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Yetkisiz'; end if;
  delete from public.user_mutes
  where muter_id = p_muter_id and muted_id = p_muted_id;
end;
$$;

-- ─── Grants ───────────────────────────────────────────────────────────────────

grant execute on function public.admin_list_staff_requests to authenticated;
grant execute on function public.admin_update_staff_request_status to authenticated;
grant execute on function public.admin_list_job_seekers to authenticated;
grant execute on function public.admin_update_job_seeker_status to authenticated;
grant execute on function public.admin_list_business_campaigns to authenticated;
grant execute on function public.admin_moderate_business_campaign to authenticated;
grant execute on function public.admin_override_news_verification to authenticated;
grant execute on function public.admin_remove_news_verification to authenticated;
grant execute on function public.admin_list_call_sessions to authenticated;
grant execute on function public.admin_terminate_call_session to authenticated;
grant execute on function public.admin_list_daily_agenda to authenticated;
grant execute on function public.admin_upsert_daily_agenda to authenticated;
grant execute on function public.admin_delete_daily_agenda to authenticated;
grant execute on function public.admin_list_profile_boosts to authenticated;
grant execute on function public.admin_revoke_profile_boost to authenticated;
grant execute on function public.admin_grant_profile_boost to authenticated;
grant execute on function public.admin_list_user_blocks to authenticated;
grant execute on function public.admin_list_user_mutes to authenticated;
grant execute on function public.admin_remove_user_block to authenticated;
grant execute on function public.admin_remove_user_mute to authenticated;
