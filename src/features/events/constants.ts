import type { CenterDef } from '@/features/centers/types';
import type { EventCategory, EventMapCategory, EventTab } from '@/features/events/types';

export const EVENT_CENTER_DEF: CenterDef = {
  id: 'event-center',
  section: 36,
  route: '/event-center',
  title: 'Etkinlik Merkezi',
  subtitle: 'Konser, festival, toplantı ve bölgesel etkinlikler',
  icon: 'calendar',
  accent: '#E91E63',
  group: 'community',
  hasCreate: true,
};

export const EVENT_TABS: { id: EventTab; label: string; icon: string }[] = [
  { id: 'upcoming', label: 'Yaklaşan', icon: 'calendar-outline' },
  { id: 'nearby', label: 'Yakınımdaki', icon: 'navigate-outline' },
  { id: 'attending', label: 'Katıldıklarım', icon: 'checkmark-circle-outline' },
  { id: 'following', label: 'Takip', icon: 'heart-outline' },
  { id: 'mine', label: 'Etkinliklerim', icon: 'create-outline' },
];

export const EVENT_CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: 'concert', label: 'Konser' },
  { value: 'festival', label: 'Festival' },
  { value: 'sports', label: 'Spor Organizasyonu' },
  { value: 'tournament', label: 'Turnuva' },
  { value: 'meeting', label: 'Toplantı' },
  { value: 'seminar', label: 'Seminer' },
  { value: 'education', label: 'Eğitim' },
  { value: 'wedding_venue', label: 'Düğün Salonu Etkinliği' },
  { value: 'business', label: 'İşletme Etkinliği' },
  { value: 'municipality', label: 'Belediye Etkinliği' },
  { value: 'university', label: 'Üniversite Etkinliği' },
  { value: 'social_responsibility', label: 'Sosyal Sorumluluk' },
];

export const EVENT_CATEGORY_ICONS: Record<EventCategory, string> = {
  concert: 'musical-notes',
  festival: 'ribbon',
  sports: 'football',
  tournament: 'trophy',
  meeting: 'people',
  seminar: 'easel',
  education: 'school',
  wedding_venue: 'heart',
  business: 'briefcase',
  municipality: 'business',
  university: 'library',
  social_responsibility: 'hand-left',
};

export const EVENT_MAP_CATEGORY_COLORS: Record<EventMapCategory, string> = {
  entertainment: '#E91E63',
  sports: '#FF5722',
  education: '#2196F3',
  municipality: '#4CAF50',
  business: '#FF9800',
};

export const EVENT_MAP_CATEGORY_LABELS: Record<EventMapCategory, string> = {
  entertainment: 'Eğlence',
  sports: 'Spor',
  education: 'Eğitim',
  municipality: 'Belediye',
  business: 'İşletme',
};

export const NEARBY_EVENTS_RADIUS_KM = 25;

export const EVENT_SHARE_CARD_WIDTH = 360;

export function buildEventCheckInDeepLink(token: string): string {
  return `vora://event-checkin?token=${encodeURIComponent(token.trim())}`;
}

export function formatEventShareDisplayPath(eventId: string): string {
  return `vora.app/events/${eventId}`;
}

export function eventCategoryLabel(category: EventCategory | string): string {
  return EVENT_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

export function eventDetailPath(id: string): string {
  return `/detail/events/${id}`;
}

export function eventEditPath(id: string): string {
  return `/event-center/edit/${id}`;
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEventDateCompact(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) {
    return `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return `Yarın ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const DEFAULT_LIVE_WINDOW_MS = 8 * 60 * 60 * 1000;

/** Haritada gösterilecek etkinlikler için başlangıç alt sınırı (bitiş tarihi yoksa). */
export function eventMapStartsCutoffIso(): string {
  return new Date(Date.now() - DEFAULT_LIVE_WINDOW_MS).toISOString();
}

/** Etkinlik haritada hâlâ görünür mü (silinmemiş + süresi dolmamış). */
export function isEventActiveOnMap(startsAt: string, endsAt?: string | null): boolean {
  const now = Date.now();
  if (endsAt) return now <= new Date(endsAt).getTime();
  return now <= new Date(startsAt).getTime() + DEFAULT_LIVE_WINDOW_MS;
}

/** Etkinlik şu an devam ediyor mu (bitiş yoksa başlangıçtan sonra 8 saat). */
export function isEventLiveNow(startsAt: string, endsAt?: string | null): boolean {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  if (now < start) return false;
  if (endsAt) return now <= new Date(endsAt).getTime();
  return now - start <= DEFAULT_LIVE_WINDOW_MS;
}

/** Yaklaşan etkinlikler için kısa zaman etiketi. */
export function formatEventCountdown(startsAt: string, endsAt?: string | null): string {
  if (isEventLiveNow(startsAt, endsAt)) return 'Şimdi devam ediyor';

  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const diff = start - now;

  if (diff <= 0) return 'Başladı';

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatEventDate(startsAt);
  if (days >= 1) return `${days} gün sonra`;
  if (hours >= 1) return `${hours} saat sonra`;
  if (minutes >= 1) return `${minutes} dk sonra`;
  return 'Çok yakında';
}

export function eventAccentColor(mapCategory?: string): string {
  if (mapCategory && mapCategory in EVENT_MAP_CATEGORY_COLORS) {
    return EVENT_MAP_CATEGORY_COLORS[mapCategory as EventMapCategory];
  }
  return EVENT_CENTER_DEF.accent;
}
