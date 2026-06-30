import { MarketplaceOptionSheet } from '@/features/marketplace/components/MarketplaceOptionSheet';
import { MARKETPLACE_CATEGORIES } from '@/features/marketplace/constants';
import type { MarketplaceCategory } from '@/features/marketplace/types';

type Props = {
  visible: boolean;
  activeCategory: MarketplaceCategory | null;
  onClose: () => void;
  onSelect: (category: MarketplaceCategory) => void;
};

const CATEGORY_OPTIONS = MARKETPLACE_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
  icon: c.icon,
  color: c.color,
}));

export function MarketplaceCategorySheet({ visible, activeCategory, onClose, onSelect }: Props) {
  return (
    <MarketplaceOptionSheet
      visible={visible}
      onClose={onClose}
      title="Kategoriler"
      subtitle="İlgilendiğiniz kategoriyi seçin"
      value={activeCategory}
      options={CATEGORY_OPTIONS}
      onSelect={onSelect}
      searchPlaceholder="Kategori ara…"
    />
  );
}
