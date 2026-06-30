-- Yolcu rezervasyon iptali + taslak yolculuk düzenleme

create or replace function public.cancel_passenger_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then raise exception 'Rezervasyon bulunamadı'; end if;
  if v_res.passenger_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_res.status not in ('pending', 'approved') then raise exception 'Bu rezervasyon iptal edilemez'; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;
  if v_trip.status in ('in_progress', 'completed', 'cancelled') then
    raise exception 'Yolculuk başladı veya tamamlandı — iptal edilemez';
  end if;

  if v_res.status = 'approved' then
    update public.ride_trips
    set available_seats = least(seats_total, available_seats + v_res.seat_count),
        status = case when status = 'full' then 'published'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;
  end if;

  update public.ride_reservations
  set status = 'cancelled',
      cancelled_at = now(),
      payment_status = case
        when v_res.payment_status = 'held' then 'refunded'::public.ride_payment_status
        else v_res.payment_status
      end,
      refunded_at = case when v_res.payment_status = 'held' then now() else refunded_at end,
      updated_at = now()
  where id = p_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id,
    'ride_reservation_rejected',
    'Rezervasyon iptal edildi',
    'Yolcu rezervasyonunu iptal etti',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    auth.uid()
  );
end;
$$;

create or replace function public.update_ride_trip_draft(
  p_trip_id uuid,
  p_vehicle_id uuid,
  p_from_city_id text,
  p_to_city_id text,
  p_meeting_point text default null,
  p_trip_type text default 'one_way',
  p_contribution_cents int default null,
  p_seats_total int default null,
  p_departure_date date default null,
  p_departure_time time default null,
  p_description text default null,
  p_luggage text default 'small',
  p_smoking_allowed boolean default false,
  p_pets_allowed boolean default false,
  p_women_only boolean default false,
  p_music_preference text default 'any',
  p_stop_city_ids text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_city_id text;
  v_order int := 0;
  v_coords record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'draft' then raise exception 'Yalnızca taslak yolculuklar düzenlenebilir'; end if;

  update public.ride_trips
  set vehicle_id = p_vehicle_id,
      from_city_id = p_from_city_id,
      to_city_id = p_to_city_id,
      meeting_point = nullif(trim(coalesce(p_meeting_point, '')), ''),
      trip_type = p_trip_type::public.ride_trip_type,
      contribution_cents = coalesce(p_contribution_cents, contribution_cents),
      seats_total = coalesce(p_seats_total, seats_total),
      available_seats = coalesce(p_seats_total, seats_total),
      departure_date = coalesce(p_departure_date, departure_date),
      departure_time = coalesce(p_departure_time, departure_time),
      description = nullif(trim(coalesce(p_description, '')), ''),
      luggage = p_luggage::public.ride_luggage_size,
      smoking_allowed = p_smoking_allowed,
      pets_allowed = p_pets_allowed,
      women_only = p_women_only,
      music_preference = p_music_preference::public.ride_music_preference,
      updated_at = now()
  where id = p_trip_id;

  delete from public.ride_trip_stops where trip_id = p_trip_id;

  foreach v_city_id in array coalesce(p_stop_city_ids, '{}')
  loop
    v_order := v_order + 1;
    insert into public.ride_trip_stops (trip_id, city_id, stop_order, latitude, longitude)
    values (p_trip_id, v_city_id, v_order, null, null);
  end loop;
end;
$$;

grant execute on function public.cancel_passenger_reservation(uuid) to authenticated;
grant execute on function public.update_ride_trip_draft(uuid, uuid, text, text, text, text, int, int, date, time, text, text, boolean, boolean, boolean, text, text[]) to authenticated;
