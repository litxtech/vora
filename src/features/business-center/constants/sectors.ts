import { BUSINESS_CATEGORY_OPTIONS } from '@/constants/registration';
import type { BusinessCategoryId } from '@/constants/registration';
import type { Ionicons } from '@expo/vector-icons';
import type { BusinessCommerceMode } from '@/features/business-center/types';

const SECTOR_ICON: Record<BusinessCategoryId, keyof typeof Ionicons.glyphMap> = {
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

export type BusinessSectorOption = {
  id: BusinessCategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const BUSINESS_SECTOR_OPTIONS: BusinessSectorOption[] = BUSINESS_CATEGORY_OPTIONS.map((opt) => ({
  id: opt.id,
  label: opt.label,
  icon: SECTOR_ICON[opt.id],
}));

export function businessSectorLabel(category: string): string {
  return BUSINESS_SECTOR_OPTIONS.find((s) => s.id === category)?.label ?? category;
}

export function businessSectorIcon(category: string): keyof typeof Ionicons.glyphMap {
  return SECTOR_ICON[category as BusinessCategoryId] ?? 'storefront-outline';
}

export function filterBusinessSectors(query: string): BusinessSectorOption[] {
  const q = query.trim().toLocaleLowerCase('tr');
  if (!q) return BUSINESS_SECTOR_OPTIONS;
  return BUSINESS_SECTOR_OPTIONS.filter(
    (s) => s.label.toLocaleLowerCase('tr').includes(q) || s.id.includes(q),
  );
}

/** Sektöre göre önerilen mağaza modu */
export function suggestCommerceModeForSector(category: string): BusinessCommerceMode {
  if (category === 'hotel') return 'hotel';
  if (category === 'retail' || category === 'agriculture') return 'ecommerce';
  if (category === 'tourism') return 'both';
  return 'showcase';
}
