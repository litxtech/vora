-- ride_trips ↔ ride_reservations RLS döngüsünü kır (security definer yardımcılar)

create or replace function public.is_ride_trip_passenger(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ride_reservations r
    where r.trip_id = p_trip_id and r.passenger_id = auth.uid()
  );
$$;

create or replace function public.is_ride_trip_driver(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ride_trips t
    where t.id = p_trip_id and t.driver_id = auth.uid()
  );
$$;

grant execute on function public.is_ride_trip_passenger(uuid) to authenticated, anon;
grant execute on function public.is_ride_trip_driver(uuid) to authenticated, anon;

drop policy if exists ride_trips_read on public.ride_trips;
create policy ride_trips_read on public.ride_trips for select using (
  status in ('published', 'full', 'in_progress', 'completed')
  or driver_id = auth.uid()
  or public.is_moderator()
  or public.is_ride_trip_passenger(id)
);

drop policy if exists ride_reservations_read on public.ride_reservations;
create policy ride_reservations_read on public.ride_reservations for select using (
  passenger_id = auth.uid()
  or public.is_ride_trip_driver(trip_id)
  or public.is_moderator()
);

drop policy if exists ride_trip_conv_read on public.ride_trip_conversations;
create policy ride_trip_conv_read on public.ride_trip_conversations for select using (
  public.is_ride_trip_driver(trip_id)
  or public.is_ride_trip_passenger(trip_id)
  or public.is_moderator()
);

drop policy if exists ride_live_read on public.ride_live_locations;
create policy ride_live_read on public.ride_live_locations for select using (
  public.is_ride_trip_driver(trip_id)
  or exists (
    select 1 from public.ride_reservations r
    where r.trip_id = ride_live_locations.trip_id
      and r.passenger_id = auth.uid()
      and r.status = 'approved'
  )
  or public.is_moderator()
);

drop policy if exists ride_stops_write on public.ride_trip_stops;
create policy ride_stops_write on public.ride_trip_stops for all using (
  public.is_ride_trip_driver(trip_id)
) with check (
  public.is_ride_trip_driver(trip_id)
);
