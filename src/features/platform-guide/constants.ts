import type { Ionicons } from '@expo/vector-icons';
import type { PlatformGuideCategory } from '@/features/platform-guide/types';

export const PLATFORM_GUIDE_ROUTE = '/settings/platform-guide' as const;

export function platformGuideDetailPath(slug: string): string {
  return `/settings/platform-guide/${encodeURIComponent(slug)}`;
}

export const PLATFORM_GUIDE_CATEGORY_META: Record<
  PlatformGuideCategory,
  { label: string; accent: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  wallet: { label: 'Cüzdan', accent: '#2563EB', icon: 'wallet-outline' },
  points: { label: 'Güven Puanı', accent: '#FBBF24', icon: 'shield-checkmark-outline' },
  features: { label: 'Özellikler', accent: '#8B5CF6', icon: 'compass-outline' },
  policy: { label: 'Politika & Kurallar', accent: '#10B981', icon: 'document-text-outline' },
  general: { label: 'Genel', accent: '#64748B', icon: 'book-outline' },
};

export const PLATFORM_GUIDE_ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
  'wallet-outline',
  'shield-checkmark-outline',
  'compass-outline',
  'document-text-outline',
  'book-outline',
  'help-circle-outline',
  'information-circle-outline',
  'star-outline',
  'gift-outline',
  'diamond-outline',
];

export const EMPTY_GUIDE_SECTION = { heading: '', body: '' } as const;

export const PLATFORM_GUIDE_HUB_INTRO =
  'Cüzdan, güven puanı ve platform özellikleri hakkında kısa ve anlaşılır rehberler.';
