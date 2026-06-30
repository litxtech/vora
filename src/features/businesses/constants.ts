import { BUSINESS_CATEGORY_OPTIONS } from '@/constants/registration';
import type { Ionicons } from '@expo/vector-icons';

export const BUSINESS_ACCENT = '#7C4DFF';
export const BUSINESS_ACCENT_DEEP = '#512DA8';
export const BUSINESS_GRADIENT = ['#7C4DFF', '#B388FF'] as const;

const CATEGORY_ACCENT: Record<string, string> = {
  restaurant: '#FF6D00',
  hotel: '#7C4DFF',
  retail: '#E91E63',
  health: '#00BCD4',
  education: '#3F51B5',
  construction: '#8D6E63',
  transport: '#1565C0',
  tourism: '#FF4081',
  technology: '#651FFF',
  agriculture: '#FF8F00',
  services: '#5C6BC0',
  other: '#7C4DFF',
};

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant-outline',
  hotel: 'bed-outline',
  retail: 'bag-handle-outline',
  health: 'medkit-outline',
  education: 'school-outline',
  construction: 'construct-outline',
  transport: 'bus-outline',
  tourism: 'compass-outline',
  technology: 'hardware-chip-outline',
  agriculture: 'leaf-outline',
  services: 'briefcase-outline',
  other: 'storefront-outline',
};

export function businessCategoryLabel(category: string): string {
  const match = BUSINESS_CATEGORY_OPTIONS.find((opt) => opt.id === category);
  return match?.label ?? category;
}

export function businessCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICON[category] ?? 'storefront-outline';
}

export function businessCategoryAccent(category: string): string {
  return CATEGORY_ACCENT[category] ?? BUSINESS_ACCENT;
}
