import type { CenterDef } from '@/features/centers/types';
import type {
  RideLuggageSize,
  RideMusicPreference,
  RideReservationStatus,
  RideTab,
  RideTripStatus,
  RideTripType,
  RideVehicleType,
  RideVehicleVerificationStatus,
} from '@/features/rides/types';
import { filterTurkishCities, TURKISH_CITIES, turkishCityName } from '@/constants/turkishCities';

export const RIDES_CENTER_DEF: CenterDef = {
  id: 'rides',
  section: 58,
  route: '/rides-center',
  title: 'Paylaşımlı Yolculuk',
  subtitle: 'Boş koltuk paylaş · masraf böl · yol arkadaşı bul',
  icon: 'car',
  accent: '#2196F3',
  group: 'economy',
  hasMap: true,
  hasCreate: true,
};

export const RIDES_ACCENT = '#2196F3';
export const RIDES_ACCENT_DEEP = '#1565C0';
export const RIDES_GRADIENT = ['#2196F3', '#F07167'] as const;
export const RIDE_COMMISSION_RATE = 0.1;
export const RIDE_MAX_DAILY_TRIPS = 3;
export const RIDE_MAX_PHOTOS = 6;
export const RIDE_MIN_CONTRIBUTION_CENTS = 5000;
/** Otomatik yolculuk bitişi: tahmini süre + bu kadar dakika */
export const RIDE_AUTO_COMPLETE_BUFFER_MINUTES = 15;
/** Mesafe tabanlı süre tahmini (km/saat) */
export const RIDE_FALLBACK_SPEED_KMH = 75;

/** Tüm Türkiye illeri — paylaşımlı yolculukta şehir kısıtı yok */
export const RIDE_CITIES = TURKISH_CITIES;

export type RideCityId = string;

export function filterRideCities(query: string, excludeIds: string[] = []) {
  return filterTurkishCities(query, excludeIds);
}

export const POPULAR_ROUTES = [
  { from: 'trabzon', to: 'samsun', stops: ['giresun', 'ordu'] as RideCityId[] },
  { from: 'trabzon', to: 'rize', stops: [] as RideCityId[] },
  { from: 'trabzon', to: 'artvin', stops: [] as RideCityId[] },
  { from: 'ordu', to: 'samsun', stops: [] as RideCityId[] },
] as const;

export const RIDES_TABS: { id: RideTab; label: string; icon: string }[] = [
  { id: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { id: 'ongoing', label: 'Yolda', icon: 'navigate-outline' },
  { id: 'today', label: 'Bugün', icon: 'today-outline' },
  { id: 'week', label: 'Bu Hafta', icon: 'calendar-outline' },
  { id: 'routes', label: 'Popüler Hatlar', icon: 'git-branch-outline' },
  { id: 'favorites', label: 'Favoriler', icon: 'heart-outline' },
  { id: 'mine', label: 'Yolculuklarım', icon: 'person-outline' },
];

export const RIDES_PRIMARY_TABS = RIDES_TABS.filter((t) =>
  (['discover', 'ongoing', 'today', 'week', 'routes', 'favorites'] as RideTab[]).includes(t.id),
);

export const TRIP_TYPE_OPTIONS: { id: RideTripType; label: string }[] = [
  { id: 'one_way', label: 'Tek yön' },
  { id: 'round_trip', label: 'Gidiş-dönüş' },
  { id: 'event_route', label: 'Gezi rotası' },
  { id: 'recurring', label: 'Düzenli sefer' },
];

export const VEHICLE_TYPE_OPTIONS: { id: RideVehicleType; label: string; maxSeats: number }[] = [
  { id: 'car', label: 'Binek araç', maxSeats: 4 },
  { id: 'van', label: 'Van', maxSeats: 8 },
  { id: 'minibus', label: 'Minibüs', maxSeats: 16 },
];

export const LUGGAGE_OPTIONS: { id: RideLuggageSize; label: string }[] = [
  { id: 'none', label: 'Bagaj yok' },
  { id: 'small', label: 'Küçük çanta' },
  { id: 'medium', label: 'Orta boy valiz' },
  { id: 'large', label: 'Büyük bagaj' },
];

export const MUSIC_OPTIONS: { id: RideMusicPreference; label: string }[] = [
  { id: 'any', label: 'Fark etmez' },
  { id: 'quiet', label: 'Sessiz yolculuk' },
  { id: 'driver_choice', label: 'Sürücü seçer' },
  { id: 'passenger_choice', label: 'Yolcular birlikte seçer' },
];

export const TRIP_STATUS_LABELS: Record<RideTripStatus, string> = {
  draft: 'Taslak',
  published: 'Yayında',
  full: 'Dolu',
  in_progress: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export const RESERVATION_STATUS_LABELS: Record<RideReservationStatus, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ödeme bekleniyor',
  card_saved: 'Kart kaydedildi — onay bekliyor',
  held: 'Ödeme alındı',
  charge_pending: 'Tahsilat işleniyor',
  released: 'Sürücüye aktarım planlandı',
  refund_pending: 'İade işleniyor',
  refunded: 'İade edildi',
  failed: 'Tahsilat başarısız',
};

/** Sürücü hariç paylaşılabilir koltuk üst sınırı */
export function maxRidePassengerSeats(vehicleSeatsTotal: number): number {
  return Math.max(1, vehicleSeatsTotal - 1);
}

export const TAB_EMPTY_MESSAGES: Partial<Record<RideTab, string>> = {
  discover: 'Henüz paylaşımlı yolculuk yok.',
  ongoing: 'Şu anda yolda olan yolculuk yok.',
  today: 'Bugün için yolculuk bulunamadı.',
  week: 'Bu hafta yolculuk bulunamadı.',
  routes: 'Popüler hatlarda yolculuk yok.',
  favorites: 'Henüz favori yolculuğunuz yok.',
  mine: 'Henüz yolculuk paylaşmadınız.',
};

export function ridePassengerCount(trip: { seatsTotal: number; availableSeats: number }): number {
  return Math.max(0, trip.seatsTotal - trip.availableSeats);
}

export function rideTravelerCount(trip: { seatsTotal: number; availableSeats: number }): number {
  return ridePassengerCount(trip) + 1;
}

export function formatRideTravelers(trip: { seatsTotal: number; availableSeats: number; status?: string }): string {
  const passengers = ridePassengerCount(trip);
  const total = passengers + 1;
  if (passengers === 0) return '1 kişi (sürücü)';
  return `${total} kişi (${passengers} yolcu)`;
}

export function rideCityName(id: string | null | undefined): string {
  return turkishCityName(id);
}

export function formatContribution(cents: number, currency = 'try'): string {
  if (currency.toLowerCase() === 'try') {
    return `₺${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function formatCents(cents: number): string {
  return formatContribution(cents);
}

export function computeDriverPayout(contributionCents: number, seats: number): {
  grossCents: number;
  commissionCents: number;
  netCents: number;
} {
  const grossCents = contributionCents * seats;
  const commissionCents = Math.round(grossCents * RIDE_COMMISSION_RATE);
  return { grossCents, commissionCents, netCents: grossCents - commissionCents };
}

export function tripDetailPath(id: string): string {
  return `/detail/rides/${id}`;
}

export function ridesAccountPath(): string {
  return '/rides-center/account';
}

export function ridesCreatePath(editId?: string): string {
  return editId ? `/rides-center/create?editId=${editId}` : '/rides-center/create';
}

export function myTripsPath(): string {
  return '/rides-center/my-trips';
}

export function myReservationsPath(tab?: 'mine' | 'incoming'): string {
  if (tab === 'incoming') return '/rides-center/reservations?tab=incoming';
  return '/rides-center/reservations';
}

export const RIDE_RESERVATION_POLICY_POINTS = [
  'Rezervasyon öncesi kalkış noktası, saat, koltuk ve bagaj gibi tüm detayları sürücü ile yazılı olarak netleştirin.',
  'Kartınız rezervasyon sırasında doğrulanır; katkı payı şoför onayında tahsil edilir.',
  'Şoför rezervasyonu reddederse kartınızdan ücret çekilmez.',
  'Onaylanan rezervasyonlarda iptal ve iade koşulları sınırlıdır; rezervasyon öncesi mutabakat şarttır.',
  'Anlaşmazlık veya şoför şikayetleri için canlı destek merkezini kullanın.',
] as const;

/** Kart/hesaba iade süresi — kullanıcıya gösterilen standart metin */
export const RIDE_REFUND_PAYOUT_NOTE =
  'Onaylanan iadeler ödeme yaptığınız karta veya hesabınıza genellikle 3–7 iş günü içinde yansır. Kesin süre bankanızın ve ödeme kuruluşunun işlem politikasına göre değişebilir.';

export function formatRideReservationRef(reservationId: string): string {
  return `VR-${reservationId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function rideRefundRequestPath(params?: {
  tripId?: string;
  reservationId?: string;
}): string {
  const query = new URLSearchParams();
  if (params?.tripId) query.set('tripId', params.tripId);
  if (params?.reservationId) query.set('reservationId', params.reservationId);
  const suffix = query.toString();
  return suffix ? `/rides-center/refund-request?${suffix}` : '/rides-center/refund-request';
}

export function ridesSupportPath(): string {
  return '/support-center';
}

export function liveTripPath(id: string): string {
  return `/rides-center/live/${id}`;
}

export function rideRoutePreviewPath(fromCityId: string, toCityId: string, stopCityIds: string[] = []): string {
  const stops = stopCityIds.filter((id) => id && id !== fromCityId && id !== toCityId);
  const query = new URLSearchParams({ from: fromCityId, to: toCityId });
  if (stops.length) query.set('stops', stops.join(','));
  return `/rides-center/route-preview?${query.toString()}`;
}

export function registerVehiclePath(): string {
  return '/rides-center/vehicle';
}

export function registerVehicleAddPath(): string {
  return '/rides-center/vehicle/add';
}

export function registerVehicleEditPath(vehicleId: string): string {
  return `/rides-center/vehicle/edit?id=${vehicleId}`;
}

export const VEHICLE_VERIFICATION_LABELS: Record<RideVehicleVerificationStatus, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
};

export function ridesPayoutProfilePath(): string {
  return '/rides-center/payout-profile';
}

export function ridesLicensePath(): string {
  return '/rides-center/license';
}

export function ridesEarningsPath(): string {
  return '/rides-center/earnings';
}
