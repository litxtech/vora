-- Sesli oda: koltuk talebi — yeniden katılımda rol koruma + red RPC + realtime

create or replace function public.join_city_voice_room(p_room_id uuid)
returns public.city_voice_room_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.city_voice_rooms%rowtype;
  v_membership public.city_memberships%rowtype;
  v_participant public.city_voice_room_participants;
  v_role public.city_voice_participant_role := 'listener';
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_room from public.city_voice_rooms where id = p_room_id;
  if not found or v_room.status <> 'live' then raise exception 'room not live'; end if;

  select * into v_membership from public.city_memberships
  where user_id = v_user_id and region_id = any(v_room.region_ids) and status = 'active';

  if v_membership.id is null and not public.is_admin() then
    raise exception 'must be member of participating city';
  end if;

  if v_membership.role = 'leader' then v_role := 'city_leader'; end if;

  insert into public.city_voice_room_participants (room_id, user_id, region_id, role, left_at)
  values (p_room_id, v_user_id, v_membership.region_id, v_role, null)
  on conflict (room_id, user_id) do update
    set left_at = null,
        -- Hâlâ odadaysa (yenileme) mevcut koltuğu koru; ayrılıp dönünce dinleyici başla.
        role = case
          when excluded.role = 'city_leader' then 'city_leader'::public.city_voice_participant_role
          when city_voice_room_participants.left_at is null then city_voice_room_participants.role
          else excluded.role
        end,
        region_id = coalesce(excluded.region_id, city_voice_room_participants.region_id),
        joined_at = case
          when city_voice_room_participants.left_at is null then city_voice_room_participants.joined_at
          else now()
        end
  returning * into v_participant;

  return v_participant;
end;
$$;

create or replace function public.reject_city_voice_speaker(
  p_room_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leader_id uuid := auth.uid();
  v_target_membership public.city_memberships%rowtype;
  v_leader_membership public.city_memberships%rowtype;
begin
  select * into v_target_membership from public.city_memberships
  where user_id = p_user_id and status = 'active';

  select * into v_leader_membership from public.city_memberships
  where user_id = v_leader_id and status = 'active' and role = 'leader'
    and region_id = v_target_membership.region_id;

  if v_leader_membership.id is null and not public.is_admin() then
    raise exception 'can only reject speakers from your city';
  end if;

  update public.city_voice_speaker_requests
  set status = 'rejected'
  where room_id = p_room_id and user_id = p_user_id and status = 'pending';
end;
$$;

grant execute on function public.reject_city_voice_speaker(uuid, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'city_voice_room_participants'
  ) then
    alter publication supabase_realtime add table public.city_voice_room_participants;
  end if;
end;
$$;
