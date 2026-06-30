-- Push bildirimi eksikleri: otel admin iptal/iade, İzdivaç erişim iptali

insert into public.notification_sound_settings (event_type, label) values
  ('izdivac_access_revoked', 'İzdivaç Erişim İptali'),
  ('hotel_reservation_cancelled', 'Otel Rezervasyon İptali')
on conflict (event_type) do nothing;

-- ─── Otel: admin iptal → misafir + sahip inbox + push ───────────────────────

create or replace function public.admin_cancel_hotel_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
  v_hotel_name text;
  v_reason text := nullif(trim(p_reason), '');
  v_guest_body text;
  v_owner_body text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_res from public.hotel_reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('error', 'Rezervasyon bulunamadı');
  end if;

  if v_res.status not in ('pending_payment', 'confirmed') then
    return jsonb_build_object('error', 'Bu rezervasyon iptal edilemez');
  end if;

  if v_res.status = 'confirmed' then
    perform public.release_hotel_room_on_cancel(v_res.hotel_id);
  end if;

  update public.hotel_reservations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_reservation_id;

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'admin_cancelled', auth.uid(),
    jsonb_build_object('reason', v_reason)
  );

  perform public.log_commerce_admin_action(
    'hotel', 'cancel', p_reservation_id, v_res.reservation_code,
    jsonb_build_object('reason', v_reason)
  );

  select coalesce(hl.name, 'Otel') into v_hotel_name
  from public.hotel_listings hl
  where hl.id = v_res.hotel_id;

  v_guest_body := v_hotel_name || ' · ' || v_res.reservation_code || ' rezervasyonunuz iptal edildi'
    || case when v_reason is not null then ' · ' || v_reason else '' end;

  v_owner_body := v_res.reservation_code || ' · Admin tarafından iptal edildi'
    || case when v_reason is not null then ' · ' || v_reason else '' end;

  perform public.notify_hotel_reservation_users(
    v_res.guest_id,
    'hotel_reservation_cancelled'::public.notification_event_type,
    'Rezervasyon iptal edildi',
    v_guest_body,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'reservation_code', v_res.reservation_code,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations',
      'segment', 'guest',
      'admin_action', true,
      'cancel_reason', v_reason
    ),
    auth.uid()
  );

  perform public.notify_hotel_reservation_users(
    v_res.owner_id,
    'hotel_reservation_cancelled'::public.notification_event_type,
    'Rezervasyon iptal edildi',
    v_owner_body,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'reservation_code', v_res.reservation_code,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations?segment=owner',
      'segment', 'owner',
      'admin_action', true,
      'cancel_reason', v_reason
    ),
    auth.uid()
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── Otel: admin iade → misafir + sahip inbox + push ────────────────────────

create or replace function public.admin_mark_hotel_reservation_refunded(
  p_reservation_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.hotel_reservations%rowtype;
  v_hotel_name text;
  v_reason text := nullif(trim(p_reason), '');
  v_guest_body text;
  v_owner_body text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  select * into v_res from public.hotel_reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('error', 'Rezervasyon bulunamadı');
  end if;

  if v_res.status = 'confirmed' then
    perform public.release_hotel_room_on_cancel(v_res.hotel_id);
  end if;

  update public.hotel_reservations
  set status = 'refunded', payment_status = 'refunded', updated_at = now()
  where id = p_reservation_id;

  perform public.log_hotel_reservation_event(
    p_reservation_id, 'admin_refunded', auth.uid(),
    jsonb_build_object('reason', v_reason)
  );

  perform public.log_commerce_admin_action(
    'hotel', 'refund', p_reservation_id, v_res.reservation_code,
    jsonb_build_object('reason', v_reason)
  );

  select coalesce(hl.name, 'Otel') into v_hotel_name
  from public.hotel_listings hl
  where hl.id = v_res.hotel_id;

  v_guest_body := v_hotel_name || ' · ' || v_res.reservation_code
    || ' · Ödemeniz iade edildi'
    || case when v_reason is not null then ' · ' || v_reason else '' end;

  v_owner_body := v_res.reservation_code || ' · Rezervasyon iade edildi'
    || case when v_reason is not null then ' · ' || v_reason else '' end;

  perform public.notify_hotel_reservation_users(
    v_res.guest_id,
    'hotel_reservation_cancelled'::public.notification_event_type,
    'Rezervasyon iadesi',
    v_guest_body,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'reservation_code', v_res.reservation_code,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations',
      'segment', 'guest',
      'admin_refunded', true,
      'refund_reason', v_reason
    ),
    auth.uid()
  );

  perform public.notify_hotel_reservation_users(
    v_res.owner_id,
    'hotel_reservation_cancelled'::public.notification_event_type,
    'Rezervasyon iadesi',
    v_owner_body,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'reservation_code', v_res.reservation_code,
      'hotel_id', v_res.hotel_id,
      'deep_link', '/hotel-center/reservations?segment=owner',
      'segment', 'owner',
      'admin_refunded', true,
      'refund_reason', v_reason
    ),
    auth.uid()
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── İzdivaç: erişim iptali → inbox + push ───────────────────────────────────

create or replace function public.admin_revoke_izdivac_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revoked boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Yetkisiz erişim';
  end if;

  delete from public.izdivac_presence where user_id = p_user_id;

  update public.profiles
  set izdivac_access_granted = false, updated_at = now()
  where id = p_user_id
    and izdivac_access_granted = true
  returning true into v_revoked;

  if not coalesce(v_revoked, false) then
    return;
  end if;

  perform public.notify_profile_user(
    p_user_id,
    'izdivac_access_revoked',
    'İzdivaç erişiminiz kapatıldı',
    'İzdivaç merkezi erişiminiz yönetici tarafından sonlandırıldı.',
    jsonb_build_object(
      'kind', 'izdivac_access_revoked',
      'centerId', 'izdivac-center',
      'deep_link', '/(tabs)/centers'
    )
  );
end;
$$;

notify pgrst, 'reload schema';
