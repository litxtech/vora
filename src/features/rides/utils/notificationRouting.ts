import type { Ionicons } from '@expo/vector-icons';
import type { NotificationEventType } from '@/constants/notifications';
import { turkishCityName } from '@/constants/turkishCities';
import {
  myReservationsPath,
  myTripsPath,
  rideRefundRequestPath,
  tripDetailPath,
} from '@/features/rides/constants';
import { WALLET_ROUTE } from '@/features/wallet/constants';

type RideDetailLine = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

const RIDE_EVENT_PREFIX = 'ride_';

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function pickDeepLink(data: Record<string, unknown>): string | null {
  const raw = data.deep_link ?? data.deepLink ?? data.url;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.startsWith('/') ? trimmed : null;
}

export function isRideNotificationEvent(eventType: string): boolean {
  return eventType.startsWith(RIDE_EVENT_PREFIX);
}

/** Yolcu iade ekranına yönlendirme — sürücü / yolcu iptali bildirimlerinde kapalı. */
export function shouldOpenRideRefundRequest(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): boolean {
  if (data.audience === 'driver') return false;
  if (data.refund_eligible === false) return false;
  if (data.cancelled_by_passenger === true) return false;
  if (eventType === 'ride_passenger_cancelled_reservation') return false;

  if (eventType === 'ride_reservation_rejected' || eventType === 'ride_trip_cancelled') {
    if (data.refund_eligible === true) return true;
    if (data.audience === 'passenger') return true;
    const reservationId = pickString(data, 'reservationId', 'reservation_id');
    if (eventType === 'ride_trip_cancelled' && reservationId) return true;
    if (eventType === 'ride_reservation_rejected' && data.cancelled_by_passenger !== true) {
      return true;
    }
    return false;
  }
  return false;
}

export function rideRouteLabel(data: Record<string, unknown>): string | null {
  const explicit =
    pickString(data, 'route_label', 'routeLabel') ??
    pickString(data, 'route', 'route_name', 'routeName');
  if (explicit) return explicit;

  const fromId = pickString(data, 'from_city_id', 'fromCityId', 'from_city', 'fromCity');
  const toId = pickString(data, 'to_city_id', 'toCityId', 'to_city', 'toCity');
  if (fromId && toId) {
    return `${turkishCityName(fromId)} → ${turkishCityName(toId)}`;
  }

  const body = pickString(data, 'body');
  if (body) {
    const match = body.match(/^([^·]+→[^·]+)/);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

export function resolveRideNotificationHref(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): string {
  const deepLink = pickDeepLink(data);
  if (deepLink) return deepLink;

  const tripId = pickString(data, 'tripId', 'trip_id');
  const reservationId = pickString(data, 'reservationId', 'reservation_id');
  const reminderKind = pickString(data, 'reminder_kind', 'reminderKind');

  if (eventType === 'ride_payout_due' || eventType === 'ride_payout_completed') {
    return WALLET_ROUTE;
  }

  if (eventType === 'ride_reservation_new') {
    return myReservationsPath('incoming');
  }

  if (eventType === 'ride_reservation_paid' || eventType === 'ride_reservation_approved') {
    return tripId ? tripDetailPath(tripId) : myReservationsPath();
  }

  if (eventType === 'ride_reservation_rejected' || eventType === 'ride_trip_cancelled') {
    if (shouldOpenRideRefundRequest(eventType, data) && (reservationId || tripId)) {
      return rideRefundRequestPath({
        tripId: tripId ?? undefined,
        reservationId: reservationId ?? undefined,
      });
    }
    if (tripId) return tripDetailPath(tripId);
    return myReservationsPath();
  }

  if (eventType === 'ride_passenger_cancelled_reservation') {
    return tripId ? tripDetailPath(tripId) : myTripsPath();
  }

  if (
    eventType === 'ride_trip_departure_soon' ||
    eventType === 'ride_trip_departure_due' ||
    reminderKind === 'departure_soon' ||
    reminderKind === 'departure_due'
  ) {
    return tripId ? tripDetailPath(tripId) : myTripsPath();
  }

  if (eventType === 'ride_trip_complete_soon' || reminderKind === 'complete_soon') {
    return tripId ? tripDetailPath(tripId) : myTripsPath();
  }

  if (eventType === 'ride_trip_completed') {
    return WALLET_ROUTE;
  }

  if (eventType === 'ride_trip_starting_soon') {
    return tripId ? tripDetailPath(tripId) : myReservationsPath();
  }

  if (tripId) return tripDetailPath(tripId);
  return '/rides-center';
}

export function getRideNotificationActionLabel(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): string {
  const hint = pickString(data, 'action_hint', 'actionHint');
  if (hint) return hint;

  const reminderKind = pickString(data, 'reminder_kind', 'reminderKind');

  switch (eventType) {
    case 'ride_trip_departure_soon':
    case 'ride_trip_departure_due':
      return 'Yolculuğu başlat';
    case 'ride_trip_complete_soon':
      return 'Yolculuğu tamamla';
    case 'ride_payout_due':
    case 'ride_payout_completed':
    case 'ride_trip_completed':
      return 'Cüzdanı aç';
    case 'ride_reservation_new':
      return 'Gelen istekleri gör';
    case 'ride_reservation_approved':
    case 'ride_reservation_paid':
      return 'Rezervasyonu gör';
    case 'ride_reservation_rejected':
    case 'ride_trip_cancelled':
      return shouldOpenRideRefundRequest(eventType, data) ? 'İade / detay' : 'Yolculuk detayı';
    case 'ride_passenger_cancelled_reservation':
      return 'Yolculuk detayı';
    case 'ride_trip_started':
    case 'ride_live_location_shared':
      return 'Canlı yolculuğu aç';
    case 'ride_trip_starting_soon':
      return 'Yolculuk detayı';
    default:
      if (reminderKind === 'departure_soon' || reminderKind === 'departure_due') {
        return 'Yolculuğu başlat';
      }
      if (reminderKind === 'complete_soon') return 'Yolculuğu tamamla';
      return pickString(data, 'tripId', 'trip_id') ? 'Yolculuğu aç' : 'Paylaşımlı Yolculuk';
  }
}

export function getRideNotificationDetailLines(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): RideDetailLine[] {
  const lines: RideDetailLine[] = [];
  const route = rideRouteLabel(data);
  if (route) {
    lines.push({ icon: 'navigate-outline', label: 'Güzergâh', value: route });
  }

  const seatCount = data.seat_count ?? data.seatCount;
  if (typeof seatCount === 'number' && seatCount > 0) {
    lines.push({ icon: 'people-outline', label: 'Koltuk', value: String(seatCount) });
  }

  const amount = pickString(data, 'amount_label', 'amountLabel');
  if (amount) {
    lines.push({ icon: 'cash-outline', label: 'Tutar', value: amount });
  }

  const reminderKind = pickString(data, 'reminder_kind', 'reminderKind');
  if (reminderKind === 'departure_soon') {
    lines.push({ icon: 'time-outline', label: 'Hatırlatma', value: 'Kalkışa 15 dakika kaldı' });
  } else if (reminderKind === 'departure_due') {
    lines.push({ icon: 'alarm-outline', label: 'Hatırlatma', value: 'Kalkış saati geldi' });
  } else if (reminderKind === 'complete_soon') {
    lines.push({ icon: 'flag-outline', label: 'Hatırlatma', value: 'Yolculuğu tamamlayın — kazanç cüzdana yansır' });
  } else if (eventType === 'ride_payout_due') {
    lines.push({ icon: 'wallet-outline', label: 'Ödeme', value: '3 gün içinde cüzdana yansır' });
  } else if (eventType === 'ride_payout_completed') {
    lines.push({ icon: 'wallet-outline', label: 'Ödeme', value: 'Hesaba yatırıldı' });
  }

  const section = pickString(data, 'section_label', 'sectionLabel');
  if (section) {
    lines.push({ icon: 'grid-outline', label: 'Bölüm', value: section });
  } else if (
    eventType === 'ride_trip_departure_soon' ||
    eventType === 'ride_trip_departure_due' ||
    reminderKind === 'departure_soon' ||
    reminderKind === 'departure_due'
  ) {
    lines.push({ icon: 'grid-outline', label: 'Bölüm', value: 'Paylaşımlı Yolculuk → Yolculuklarım' });
  } else if (eventType === 'ride_payout_due' || eventType === 'ride_payout_completed') {
    lines.push({ icon: 'grid-outline', label: 'Bölüm', value: 'Cüzdan → TRY kazançları' });
  } else if (eventType === 'ride_reservation_new') {
    lines.push({ icon: 'grid-outline', label: 'Bölüm', value: 'Rezervasyonlarım → Gelen istekler' });
  }

  return lines.slice(0, 4);
}
