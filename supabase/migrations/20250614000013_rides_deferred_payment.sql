-- Kart kaydet → sürücü onayı → yolculuk bitince çekim

alter type public.ride_payment_status add value if not exists 'card_saved';
alter type public.ride_payment_status add value if not exists 'charge_pending';

alter table public.ride_reservations
  add column if not exists stripe_payment_method_id text,
  add column if not exists stripe_setup_intent_id text;

-- Kart kaydı tamamlandı (Setup Checkout)
create or replace function public.fulfill_ride_reservation_card(
  p_reservation_id uuid,
  p_passenger_id uuid,
  p_session_id text,
  p_setup_intent_id text,
  p_payment_method_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then return null; end if;
  if v_res.passenger_id <> p_passenger_id then return null; end if;
  if v_res.payment_status not in ('pending') then return null; end if;
  if v_res.status not in ('pending', 'cancelled') then
    if v_res.status = 'cancelled' then
      update public.ride_reservations set status = 'pending' where id = p_reservation_id;
    else
      return null;
    end if;
  end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;
  if v_trip.status not in ('published', 'full') then return null; end if;

  update public.ride_reservations
  set payment_status = 'card_saved',
      stripe_checkout_session_id = p_session_id,
      stripe_setup_intent_id = p_setup_intent_id,
      stripe_payment_method_id = p_payment_method_id,
      updated_at = now()
  where id = p_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id,
    'ride_reservation_new',
    'Yeni rezervasyon talebi',
    v_res.seat_count || ' koltuk · kart kaydedildi — onaylayın',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    p_passenger_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    p_passenger_id,
    'ride_reservation_paid',
    'Kartınız kaydedildi',
    'Rezervasyonunuz sürücü onayı bekliyor. Ücret yolculuk bitince tahsil edilir.',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
    v_trip.driver_id
  );

  return p_reservation_id;
end;
$$;

grant execute on function public.fulfill_ride_reservation_card(uuid, uuid, text, text, text) to service_role;

-- Eski anında ödeme akışı (geriye dönük)
create or replace function public.fulfill_ride_reservation_payment(
  p_reservation_id uuid,
  p_passenger_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then return null; end if;
  if v_res.passenger_id <> p_passenger_id then return null; end if;
  if v_res.payment_status <> 'pending' then return null; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id;
  if v_trip.status not in ('published', 'full') then return null; end if;

  update public.ride_reservations
  set payment_status = 'held',
      stripe_checkout_session_id = p_session_id,
      stripe_payment_intent_id = p_payment_intent_id,
      paid_at = now(),
      updated_at = now()
  where id = p_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    v_trip.driver_id, 'ride_reservation_new', 'Yeni rezervasyon talebi',
    v_res.seat_count || ' koltuk · ödeme alındı',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id), p_passenger_id
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    p_passenger_id, 'ride_reservation_paid', 'Katkı payınız alındı',
    'Rezervasyonunuz sürücü onayı bekliyor',
    jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id), v_trip.driver_id
  );

  return p_reservation_id;
end;
$$;

-- Sürücü onayı: kart kaydı veya eski held ödeme
create or replace function public.respond_ride_reservation(
  p_reservation_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
  v_trip public.ride_trips;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found or v_res.status <> 'pending' then raise exception 'Rezervasyon bulunamadı veya işlenemez'; end if;

  select * into v_trip from public.ride_trips where id = v_res.trip_id for update;
  if v_trip.driver_id <> auth.uid() and not public.is_moderator() then raise exception 'Yetkisiz'; end if;

  if p_approve then
    if v_res.payment_status not in ('held', 'card_saved') then
      raise exception 'Kart kaydı veya ödeme henüz tamamlanmadı';
    end if;
    if v_res.seat_count > v_trip.available_seats then raise exception 'Yeterli boş koltuk yok'; end if;

    update public.ride_reservations
    set status = 'approved', approved_at = now(), updated_at = now()
    where id = p_reservation_id;

    update public.ride_trips
    set available_seats = available_seats - v_res.seat_count,
        status = case when available_seats - v_res.seat_count <= 0 then 'full'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_trip.id;

    perform public.ensure_ride_trip_conversation(v_trip.id);

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id, 'ride_reservation_approved', 'Rezervasyon onaylandı',
      'Yolculuk rezervasyonunuz onaylandı',
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  else
    update public.ride_reservations
    set status = 'rejected',
        payment_status = case
          when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
          else v_res.payment_status
        end,
        updated_at = now()
    where id = p_reservation_id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id, 'ride_reservation_rejected', 'Rezervasyon reddedildi',
      case
        when v_res.payment_status = 'held' then 'Yolculuk rezervasyonunuz reddedildi — ödemeniz iade edilecek'
        else 'Yolculuk rezervasyonunuz reddedildi — kartınızdan ücret çekilmedi'
      end,
      jsonb_build_object('trip_id', v_trip.id, 'reservation_id', p_reservation_id),
      auth.uid()
    );
  end if;
end;
$$;

-- Yolcu iptali: kart kaydı varsa iade yok
create or replace function public.cancel_passenger_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
begin
  select r.* into v_res from public.ride_reservations r where r.id = p_reservation_id for update;
  if not found then raise exception 'Rezervasyon bulunamadı'; end if;
  if v_res.passenger_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_res.status not in ('pending', 'approved') then raise exception 'Bu rezervasyon iptal edilemez'; end if;

  update public.ride_reservations
  set status = 'cancelled',
      cancelled_at = now(),
      payment_status = case
        when v_res.payment_status = 'held' then 'refund_pending'::public.ride_payment_status
        else v_res.payment_status
      end,
      updated_at = now()
  where id = p_reservation_id;

  if v_res.status = 'approved' then
    update public.ride_trips
    set available_seats = available_seats + v_res.seat_count,
        status = case when status = 'full' then 'published'::public.ride_trip_status else status end,
        updated_at = now()
    where id = v_res.trip_id;
  end if;
end;
$$;

-- Tek rezervasyon çekimi sonrası (edge function)
create or replace function public.finalize_ride_reservation_charge(
  p_reservation_id uuid,
  p_payment_intent_id text,
  p_charge_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_reservations
  set payment_status = 'held',
      stripe_payment_intent_id = p_payment_intent_id,
      stripe_charge_id = p_charge_id,
      paid_at = now(),
      updated_at = now()
  where id = p_reservation_id
    and payment_status in ('card_saved', 'charge_pending');
end;
$$;

grant execute on function public.finalize_ride_reservation_charge(uuid, text, text) to service_role;

create or replace function public.mark_ride_reservation_charge_failed(
  p_reservation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.ride_reservations;
begin
  select * into v_res from public.ride_reservations where id = p_reservation_id;
  if not found then return; end if;

  update public.ride_reservations
  set payment_status = 'failed',
      updated_at = now()
  where id = p_reservation_id;

  insert into public.notifications (user_id, event_type, title, body, data)
  values (
    v_res.passenger_id,
    'ride_reservation_paid',
    'Ödeme alınamadı',
    coalesce(nullif(trim(p_reason), ''), 'Yolculuk sonrası karttan tahsilat başarısız. Lütfen kartınızı güncelleyin.'),
    jsonb_build_object('trip_id', v_res.trip_id, 'reservation_id', p_reservation_id)
  );
end;
$$;

grant execute on function public.mark_ride_reservation_charge_failed(uuid, text) to service_role;

-- Yolculuk tamamlama (edge function çekimlerden sonra)
create or replace function public.finalize_ride_trip_completion(p_trip_id uuid, p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_res record;
  v_due timestamptz := now() + interval '3 days';
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> p_driver_id then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  update public.ride_trips
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_trip_id;

  for v_res in
    select id, passenger_id
    from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved' and payment_status = 'held'
  loop
    update public.ride_reservations
    set status = 'completed',
        payment_status = 'released',
        completed_at = now(),
        payout_due_at = v_due,
        updated_at = now()
    where id = v_res.id;

    insert into public.notifications (user_id, event_type, title, body, data, actor_id)
    values (
      v_res.passenger_id, 'ride_trip_completed', 'Yolculuk tamamlandı',
      'Katkı payınız tahsil edildi. Deneyiminizi puanlayın.',
      jsonb_build_object('trip_id', p_trip_id, 'reservation_id', v_res.id),
      p_driver_id
    );
  end loop;

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  select
    v_trip.driver_id, 'ride_payout_due', 'Kazanç planlandı',
    'Onaylı yolculuklar tamamlandı — ödeme 3 gün içinde',
    jsonb_build_object('trip_id', p_trip_id),
    p_driver_id
  where exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and status = 'completed' and payout_completed_at is null
  );

  delete from public.ride_live_locations where trip_id = p_trip_id;
end;
$$;

grant execute on function public.finalize_ride_trip_completion(uuid, uuid) to service_role;

-- Eski doğrudan tamamlama: yalnızca zaten held olan (legacy) rezervasyonlar için
create or replace function public.complete_ride_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.ride_trips;
  v_has_card_only boolean;
begin
  select * into v_trip from public.ride_trips where id = p_trip_id for update;
  if not found then raise exception 'Yolculuk bulunamadı'; end if;
  if v_trip.driver_id <> auth.uid() then raise exception 'Yetkisiz'; end if;
  if v_trip.status <> 'in_progress' then raise exception 'Yolculuk devam etmiyor'; end if;

  select exists (
    select 1 from public.ride_reservations
    where trip_id = p_trip_id and status = 'approved' and payment_status = 'card_saved'
  ) into v_has_card_only;

  if v_has_card_only then
    raise exception 'Bu yolculuk için önce uygulama üzerinden tamamlama ve tahsilat gerekir';
  end if;

  perform public.finalize_ride_trip_completion(p_trip_id, auth.uid());
end;
$$;
