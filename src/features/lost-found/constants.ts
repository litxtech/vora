import type { CenterDef } from '@/features/centers/types';
import type { LostItemCategory, LostItemType, LostTab } from '@/features/lost-found/types';

export const LOST_CENTER_DEF: CenterDef = {
  id: 'lost-center',
  section: 38,
  route: '/lost-center',
  title: 'Kayıp Merkezi',
  subtitle: 'Kayıp hayvan, insan, eşya ve buluntu ilanları',
  icon: 'search',
  accent: '#E53935',
  group: 'community',
  hasCreate: true,
};

export const LOST_TABS: { id: LostTab; label: string; icon: string }[] = [
  { id: 'lost', label: 'Kayıp', icon: 'help-circle-outline' },
  { id: 'found', label: 'Buluntu', icon: 'checkmark-circle-outline' },
  { id: 'urgent', label: 'Acil', icon: 'flash-outline' },
  { id: 'nearby', label: 'Yakınımdaki', icon: 'navigate-outline' },
  { id: 'recent', label: 'Son İlanlar', icon: 'time-outline' },
  { id: 'mine', label: 'İlanlarım', icon: 'person-outline' },
  { id: 'resolved', label: 'Çözülen', icon: 'archive-outline' },
];

export const LOST_CATEGORY_OPTIONS: { value: LostItemCategory; label: string; icon: string }[] = [
  { value: 'animal', label: 'Kayıp Hayvan', icon: 'paw-outline' },
  { value: 'person', label: 'Kayıp İnsan', icon: 'person-outline' },
  { value: 'item', label: 'Kayıp Eşya', icon: 'cube-outline' },
  { value: 'document', label: 'Belge / Evrak', icon: 'document-outline' },
  { value: 'other', label: 'Diğer', icon: 'ellipsis-horizontal-outline' },
];

export const LOST_TYPE_OPTIONS: { value: LostItemType; label: string }[] = [
  { value: 'lost', label: 'Kayıp ilanı' },
  { value: 'found', label: 'Buluntu ilanı' },
];

export const LOST_CATEGORY_COLORS: Record<LostItemCategory, string> = {
  animal: '#8E24AA',
  person: '#E53935',
  item: '#FB8C00',
  document: '#1E88E5',
  other: '#78909C',
};

export const NEARBY_LOST_RADIUS_KM = 20;

export function lostCategoryLabel(category: LostItemCategory | string): string {
  return LOST_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

export function lostCategoryIcon(category: LostItemCategory | string): string {
  return LOST_CATEGORY_OPTIONS.find((o) => o.value === category)?.icon ?? 'ellipsis-horizontal-outline';
}

export const LOST_TAB_EMPTY_MESSAGES: Partial<Record<LostTab, string>> = {
  lost: 'Henüz kayıp ilanı yok. İlk ilanı siz verin.',
  found: 'Henüz buluntu ilanı yok.',
  urgent: 'Şu an acil ilan bulunmuyor.',
  nearby: 'Yakınınızda açık ilan yok.',
  recent: 'Son günlerde ilan eklenmemiş.',
  mine: 'Henüz ilan vermediniz.',
  resolved: 'Çözülmüş ilan bulunamadı.',
};

export function lostDetailPath(id: string): string {
  return `/detail/lost-found/${id}`;
}

export function lostEditPath(id: string): string {
  return `/lost-center/edit/${id}`;
}

export function formatLostDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLostTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} gün önce`;
  if (hours >= 1) return `${hours} saat önce`;
  if (minutes >= 1) return `${minutes} dk önce`;
  return 'Az önce';
}

export function lostAccentColor(category?: string): string {
  if (category && category in LOST_CATEGORY_COLORS) {
    return LOST_CATEGORY_COLORS[category as LostItemCategory];
  }
  return LOST_CENTER_DEF.accent;
}
