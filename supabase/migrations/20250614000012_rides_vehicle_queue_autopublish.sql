-- Admin araç kuyruğu (RPC) + onay sonrası taslak yolculukları otomatik yayınla

create or replace function public.admin_list_ride_pending_vehicles(p_limit int default 30)
returns table (
  id uuid,
  user_id uuid,
  brand text,
  model text,
  plate text,
  verification_status public.ride_vehicle_verification_status,
  created_at timestamptz,
  username text,
  full_name text,
  cover_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    v.user_id,
    v.brand,
    v.model,
    v.plate,
    v.verification_status,
    v.created_at,
    p.username,
    p.full_name,
    v.cover_url
  from public.ride_vehicles v
  join public.profiles p on p.id = v.user_id
  where public.is_moderator()
    and v.verification_status = 'pending'
    and v.is_active = true
  order by v.created_at asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.admin_list_ride_pending_vehicles(int) to authenticated;

create or replace function public.auto_publish_eligible_ride_drafts(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not exists (
    select 1 from public.ride_license_verifications l
    where l.user_id = p_user_id and l.status = 'approved'
  ) then
    return 0;
  end if;

  update public.ride_trips t
  set
    status = 'published',
    published_at = coalesce(t.published_at, now()),
    updated_at = now()
  from public.ride_vehicles v
  where t.driver_id = p_user_id
    and t.status = 'draft'
    and t.vehicle_id = v.id
    and v.user_id = p_user_id
    and v.verification_status = 'approved'
    and v.is_active = true
    and public.ride_trip_departure_istanbul(t.departure_date, t.departure_time) > now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.auto_publish_eligible_ride_drafts(uuid) to authenticated;

create or replace function public.trg_auto_publish_rides_after_vehicle_approve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'approved'
     and (old.verification_status is distinct from 'approved') then
    perform public.auto_publish_eligible_ride_drafts(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists ride_vehicles_auto_publish_trips on public.ride_vehicles;
create trigger ride_vehicles_auto_publish_trips
  after update of verification_status on public.ride_vehicles
  for each row
  execute function public.trg_auto_publish_rides_after_vehicle_approve();

create or replace function public.trg_auto_publish_rides_after_license_approve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'
     and (old.status is distinct from 'approved') then
    perform public.auto_publish_eligible_ride_drafts(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists ride_license_auto_publish_trips on public.ride_license_verifications;
create trigger ride_license_auto_publish_trips
  after update of status on public.ride_license_verifications
  for each row
  execute function public.trg_auto_publish_rides_after_license_approve();

-- Ehliyet + araç onaylı ama taslakta kalmış gelecek yolculukları yayınla
do $$
declare
  r record;
  n int;
begin
  for r in
    select distinct t.driver_id
    from public.ride_trips t
    where t.status = 'draft'
      and public.ride_trip_departure_istanbul(t.departure_date, t.departure_time) > now()
  loop
    perform public.auto_publish_eligible_ride_drafts(r.driver_id);
  end loop;
end;
$$;
