import type { CenterDef } from '@/features/centers/types';
import type { HotelFeedTab, HotelGuestType, HotelHub, HotelReservationStatus } from '@/features/hotel-center/types';

export const HOTEL_CENTER_DEF: CenterDef = {
  id: 'hotel-center',
  section: 60,
  route: '/hotel-center',
  title: 'Otel Merkezi',
  subtitle: 'Öğrenci indirimleri · canlı puanlar · konaklama',
  icon: 'bed',
  accent: '#00897B',
  group: 'economy',
  hasCreate: true,
};

export const HOTEL_ACCENT = HOTEL_CENTER_DEF.accent;
export const HOTEL_GRADIENT = ['#00897B', '#26A69A'] as const;
export const HOTEL_MAX_PHOTOS = 6;
export const HOTEL_MAX_VIDEOS = 3;
export const HOTEL_MAX_ROOM_TYPES = 12;
export const HOTEL_MAX_ROOM_PHOTOS = 3;
export const HOTEL_ROOM_TYPE_PRESETS = [
  'Standart Oda',
  'Deluxe Oda',
  'Süit',
  'Aile Odası',
  'Ekonomik Oda',
  'Deniz Manzaralı',
] as const;
export const HOTEL_NAME_MIN = 2;
export const HOTEL_NAME_MAX = 120;
export const HOTEL_DESCRIPTION_MIN = 10;
export const HOTEL_DESCRIPTION_MAX = 3000;

export const HOTEL_FEED_TABS: { id: HotelFeedTab; label: string; icon: string }[] = [
  { id: 'explore', label: 'Keşfet', icon: 'compass-outline' },
  { id: 'student_deals', label: 'Öğrenci Fırsatları', icon: 'school-outline' },
  { id: 'top_rated', label: 'En Yüksek Puan', icon: 'star-outline' },
  { id: 'nearby', label: 'Yakınımda', icon: 'navigate-outline' },
  { id: 'mine', label: 'Otellerim', icon: 'business-outline' },
];

export const HOTEL_BROWSE_TABS = HOTEL_FEED_TABS.filter((t) => t.id !== 'mine');

export const HOTEL_HUBS: {
  id: HotelHub;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'browse',
    label: 'Konaklama Ara',
    hint: 'Keşfet, rezervasyon yap',
    icon: 'search-outline',
  },
  {
    id: 'manage',
    label: 'Otelimi Yönet',
    hint: 'İlan ekle, rezervasyon al',
    icon: 'business-outline',
  },
];

export const HOTEL_TAB_EMPTY_MESSAGES: Record<HotelFeedTab, string> = {
  explore: 'Bu bölgede henüz otel ilanı yok.',
  student_deals: 'Şu an öğrenci indirimi olan otel bulunmuyor.',
  top_rated: 'Henüz puanlanmış otel yok.',
  nearby: 'Yakınınızda konumlu otel bulunamadı.',
  mine: 'Henüz otel eklemediniz.',
};

export const HOTEL_AMENITIES: { id: string; label: string; icon: string }[] = [
  { id: 'wifi', label: 'WiFi', icon: 'wifi-outline' },
  { id: 'breakfast', label: 'Kahvaltı', icon: 'cafe-outline' },
  { id: 'parking', label: 'Otopark', icon: 'car-outline' },
  { id: 'ac', label: 'Klima', icon: 'snow-outline' },
  { id: 'sea_view', label: 'Deniz Manzarası', icon: 'water-outline' },
  { id: 'pet_friendly', label: 'Evcil Hayvan', icon: 'paw-outline' },
  { id: 'laundry', label: 'Çamaşırhane', icon: 'shirt-outline' },
  { id: '24h', label: '7/24 Resepsiyon', icon: 'time-outline' },
];

export const HOTEL_GUEST_TYPE_LABELS: Record<HotelGuestType, string> = {
  student: 'Öğrenci',
  guest: 'Misafir',
  other: 'Diğer',
};

export function hotelDetailPath(id: string): string {
  return `/detail/hotels/${id}`;
}

export function hotelEditPath(id: string): string {
  return `/hotel-center/edit/${id}`;
}

export function hotelReservationsPath(segment: 'guest' | 'owner' = 'guest'): string {
  if (segment === 'owner') return '/hotel-center/reservations?segment=owner';
  return '/hotel-center/reservations';
}

export function hotelEarningsPath(): string {
  return '/hotel-center/earnings';
}

/** Platform komisyon oranı (brüt üzerinden) */
export const HOTEL_COMMISSION_RATE = 0.12;

export const HOTEL_PAYOUT_HOLD_DAYS = 7;

export function hotelCommissionBreakdown(grossCents: number) {
  const commissionCents = Math.round(grossCents * HOTEL_COMMISSION_RATE);
  const ownerPayoutCents = grossCents - commissionCents;
  return { grossCents, commissionCents, ownerPayoutCents };
}

export function formatHotelCents(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺`;
}

export const HOTEL_RESERVATION_STATUS_LABELS: Record<HotelReservationStatus, string> = {
  pending_payment: 'Ödeme bekleniyor',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  refunded: 'İade edildi',
};

export const HOTEL_RESERVATION_STATUS_COLORS: Record<HotelReservationStatus, string> = {
  pending_payment: '#F59E0B',
  confirmed: '#00897B',
  cancelled: '#94A3B8',
  completed: '#3B82F6',
  refunded: '#EF4444',
};

export function formatHotelPrice(amount: number): string {
  return `${amount.toLocaleString('tr-TR')} ₺`;
}

export function formatHotelRoomAvailability(totalRooms: number, occupiedRooms: number): string {
  const available = Math.max(0, totalRooms - occupiedRooms);
  return `${available} müsait · ${occupiedRooms} dolu · ${totalRooms} toplam`;
}

export function formatHotelRoomTypeAvailability(totalCount: number, occupiedCount: number): string {
  const available = Math.max(0, totalCount - occupiedCount);
  if (available < 1) return 'Dolu';
  return `${available} müsait`;
}

export function deriveHotelListingFromRoomTypes(
  roomTypes: { pricePerNight: number; listPricePerNight: number | null; totalCount: number; occupiedCount: number }[],
): { pricePerNight: number; listPricePerNight: number | null; totalRooms: number; occupiedRooms: number } {
  if (roomTypes.length === 0) {
    return { pricePerNight: 0, listPricePerNight: null, totalRooms: 1, occupiedRooms: 0 };
  }
  const pricePerNight = Math.min(...roomTypes.map((r) => r.pricePerNight));
  const listCandidates = roomTypes
    .map((r) => r.listPricePerNight)
    .filter((v): v is number => v != null && v > pricePerNight);
  const listPricePerNight = listCandidates.length ? Math.min(...listCandidates) : null;
  const totalRooms = roomTypes.reduce((sum, r) => sum + r.totalCount, 0);
  const occupiedRooms = Math.min(totalRooms, roomTypes.reduce((sum, r) => sum + r.occupiedCount, 0));
  return { pricePerNight, listPricePerNight, totalRooms, occupiedRooms };
}

export function validateHotelRoomTypes(
  roomTypes: { name: string; pricePerNight: number; totalCount: number; occupiedCount: number; maxGuests: number }[],
): string | null {
  if (roomTypes.length === 0) {
    return 'En az bir oda tipi ekleyin.';
  }
  if (roomTypes.length > HOTEL_MAX_ROOM_TYPES) {
    return `En fazla ${HOTEL_MAX_ROOM_TYPES} oda tipi ekleyebilirsiniz.`;
  }
  for (const room of roomTypes) {
    const name = room.name.trim();
    if (name.length < 2) return 'Oda tipi adı en az 2 karakter olmalıdır.';
    if (name.length > 80) return 'Oda tipi adı en fazla 80 karakter olabilir.';
    if (room.pricePerNight <= 0) return `"${name}" için gece fiyatı 0'dan büyük olmalıdır.`;
    if (room.totalCount < 1) return `"${name}" için oda sayısı en az 1 olmalıdır.`;
    if (room.occupiedCount < 0 || room.occupiedCount > room.totalCount) {
      return `"${name}" için dolu oda sayısı geçersiz.`;
    }
    if (room.maxGuests < 1 || room.maxGuests > 12) {
      return `"${name}" için kişi kapasitesi 1–12 arasında olmalıdır.`;
    }
  }
  return null;
}

export function discountedPrice(price: number, discountPct: number): number {
  if (discountPct <= 0) return price;
  return Math.round(price * (1 - discountPct / 100));
}

/** Liste fiyatı yalnızca Vora özel fiyatın üzerindeyse gösterilir. */
export function hotelListPriceDisplay(
  listPricePerNight: number | null | undefined,
  voraPricePerNight: number,
): number | null {
  if (listPricePerNight == null || listPricePerNight <= voraPricePerNight) return null;
  return listPricePerNight;
}

export function amenityLabel(id: string): string {
  return HOTEL_AMENITIES.find((a) => a.id === id)?.label ?? id;
}

export function validateHotelListingFields(input: {
  name: string;
  description: string;
  pricePerNight: number;
  totalRooms?: number;
  occupiedRooms?: number;
  studentDiscountPct?: number;
}): string | null {
  const name = input.name.trim();
  if (name.length < HOTEL_NAME_MIN) {
    return `Otel adı en az ${HOTEL_NAME_MIN} karakter olmalıdır.`;
  }
  if (name.length > HOTEL_NAME_MAX) {
    return `Otel adı en fazla ${HOTEL_NAME_MAX} karakter olabilir.`;
  }

  const description = input.description.trim();
  if (description.length < HOTEL_DESCRIPTION_MIN) {
    return `Açıklama en az ${HOTEL_DESCRIPTION_MIN} karakter olmalıdır.`;
  }
  if (description.length > HOTEL_DESCRIPTION_MAX) {
    return `Açıklama en fazla ${HOTEL_DESCRIPTION_MAX} karakter olabilir.`;
  }

  if (input.pricePerNight <= 0) {
    return 'Gece fiyatı 0’dan büyük olmalıdır.';
  }

  const totalRooms = input.totalRooms ?? 1;
  const occupiedRooms = input.occupiedRooms ?? 0;
  if (totalRooms < 1) return 'Toplam oda sayısı en az 1 olmalıdır.';
  if (occupiedRooms < 0 || occupiedRooms > totalRooms) {
    return 'Dolu oda sayısı 0 ile toplam oda arasında olmalıdır.';
  }

  const discount = input.studentDiscountPct ?? 0;
  if (discount < 0 || discount > 70) {
    return 'Öğrenci indirimi %0 ile %70 arasında olmalıdır.';
  }

  return null;
}
