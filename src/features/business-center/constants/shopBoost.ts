import type { ShopBoostScope, ShopBoostTier } from '@/features/business-center/types';

export const SHOP_BOOST_ACCENT = '#FF8F00';
export const SHOP_BOOST_GROWTH_DISCOUNT_RATE = 0.3;
export const SHOP_BOOST_MAX_SLOTS = 3;
export const SHOP_BOOST_MAX_SHOWCASE_ITEMS = 3;

export type ShopBoostPackageDef = {
  id: ShopBoostTier;
  label: string;
  days: number;
  subtitle: string;
  placements: string[];
  priority: number;
};

export const SHOP_BOOST_PACKAGES: ShopBoostPackageDef[] = [
  {
    id: 'starter',
    label: 'Başlangıç',
    days: 3,
    subtitle: 'Keşfet + Mağazalar listesi',
    placements: ['Keşfet işletmeler', 'Mağazalar vitrini'],
    priority: 20,
  },
  {
    id: 'standard',
    label: 'Standart',
    days: 7,
    subtitle: 'Bölgesel tam vitrin',
    placements: ['Keşfet işletmeler', 'Mağazalar carousel', 'Öne çıkan rozeti'],
    priority: 50,
  },
  {
    id: 'premium',
    label: 'Premium',
    days: 14,
    subtitle: 'Maksimum görünürlük',
    placements: ['Tüm standart yerleşimler', 'Üst sıra önceliği', 'Vitrin ürün şeridi'],
    priority: 100,
  },
];

export const SHOP_BOOST_SCOPE_OPTIONS: {
  id: ShopBoostScope;
  label: string;
  subtitle: string;
}[] = [
  { id: 'region', label: 'Bölgesel', subtitle: 'İşletmenizin kayıtlı olduğu il' },
  { id: 'karadeniz', label: 'Karadeniz geneli', subtitle: 'Tüm Karadeniz bölgeleri' },
];

/** Kuruş — SQL shop_boost_list_price_cents ile senkron */
const SHOP_BOOST_PRICE_MATRIX: Record<ShopBoostTier, Record<ShopBoostScope, number>> = {
  starter: { region: 14_900, karadeniz: 24_900 },
  standard: { region: 29_900, karadeniz: 44_900 },
  premium: { region: 49_900, karadeniz: 74_900 },
};

export function shopBoostListPriceCents(tier: ShopBoostTier, scope: ShopBoostScope): number {
  return SHOP_BOOST_PRICE_MATRIX[tier][scope];
}

export function shopBoostPackage(tier: ShopBoostTier): ShopBoostPackageDef {
  return SHOP_BOOST_PACKAGES.find((p) => p.id === tier) ?? SHOP_BOOST_PACKAGES[1];
}

export function computeShopBoostPrice(
  tier: ShopBoostTier,
  scope: ShopBoostScope,
  growthEligible: boolean,
): { listCents: number; discountCents: number; totalCents: number } {
  const listCents = shopBoostListPriceCents(tier, scope);
  const discountCents = growthEligible ? Math.round(listCents * SHOP_BOOST_GROWTH_DISCOUNT_RATE) : 0;
  return { listCents, discountCents, totalCents: listCents - discountCents };
}

export function formatShopBoostPrice(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR')} ₺`;
}

export function shopBoostTierLabel(tier: ShopBoostTier): string {
  return shopBoostPackage(tier).label;
}

export function shopBoostScopeLabel(scope: ShopBoostScope): string {
  return SHOP_BOOST_SCOPE_OPTIONS.find((o) => o.id === scope)?.label ?? scope;
}

export function formatShopBoostRemaining(endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Süre doldu';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days >= 1) return `${days} gün ${hours} sa kaldı`;
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours} sa ${minutes} dk kaldı`;
  return `${minutes} dk kaldı`;
}
