import type { CenterDef } from '@/features/centers/types';
import type { BusinessCommerceMode } from '@/features/business-center/types';

export const BUSINESS_CENTER_DEF: CenterDef = {
  id: 'business-center',
  section: 60,
  route: '/business-center',
  title: 'İşletme Mağazaları',
  subtitle: 'Kurumsal vitrin · ürün & otel',
  icon: 'bag-handle',
  accent: '#7C4DFF',
  group: 'economy',
  hasMap: false,
  hasCreate: false,
};

export const BUSINESS_ACCENT = '#7C4DFF';
export const BUSINESS_ACCENT_DEEP = '#512DA8';
export const BUSINESS_GRADIENT = ['#7C4DFF', '#B388FF'] as const;
export const BUSINESS_SHOP_CARD_RADIUS = 20;

export const BUSINESS_ROUTES = {
  hub: '/business-center',
  account: '/business-center/account',
  edit: '/business-center/edit',
  setup: '/business-center/setup',
  pending: '/business-center/pending',
  shop: (businessId: string) => `/business-center/shop/${businessId}`,
  shopCurate: '/business-center/shop-curate',
  createProduct: '/business-center/create-product',
  payout: '/marketplace-center/payout-profile',
  ads: '/ads',
  hotelManage: '/hotel-center',
  hotelCreate: '/hotel-center/create',
  hotelEarnings: '/hotel-center/earnings',
  hotelReservations: '/hotel-center/reservations',
  personnel: '/personnel-center',
  campaigns: '/profile/campaigns/create',
  shopBoost: '/business-center/shop-boost',
} as const;

export const COMMERCE_MODE_OPTIONS: {
  id: BusinessCommerceMode;
  label: string;
  subtitle: string;
  icon: string;
}[] = [
  { id: 'none', label: 'Henüz yok', subtitle: 'Mağazayı sonra açabilirsiniz', icon: 'pause-circle-outline' },
  { id: 'showcase', label: 'Kurumsal Vitrin', subtitle: 'Sektörel mağaza · iletişim & tanıtım', icon: 'storefront-outline' },
  { id: 'ecommerce', label: 'E-Ticaret', subtitle: 'Ürün satışı · Stripe güvenli ödeme', icon: 'cart-outline' },
  { id: 'hotel', label: 'Otel', subtitle: 'Oda rezervasyonu · online ödeme', icon: 'bed-outline' },
  { id: 'both', label: 'Otel + E-Ticaret', subtitle: 'Tam kurumsal vitrin', icon: 'layers-outline' },
];

export const COMMERCE_MODE_LABELS: Record<BusinessCommerceMode, string> = {
  none: 'Mağaza kapalı',
  showcase: 'Kurumsal Vitrin',
  ecommerce: 'E-Ticaret',
  hotel: 'Otel',
  both: 'Otel & E-Ticaret',
};

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
};

export function shopAccentColor(accent: string | null | undefined): string {
  if (!accent?.trim()) return BUSINESS_ACCENT;
  return accent.trim();
}

export function commerceModeShowsProducts(mode: BusinessCommerceMode): boolean {
  return mode === 'ecommerce' || mode === 'both';
}

export function commerceModeShowsHotels(mode: BusinessCommerceMode): boolean {
  return mode === 'hotel' || mode === 'both';
}

export function commerceModeIsShowcase(mode: BusinessCommerceMode): boolean {
  return mode === 'showcase';
}

export function commerceModeHasShop(mode: BusinessCommerceMode): boolean {
  return mode !== 'none';
}

export type { BusinessSectorOption } from '@/features/business-center/constants/sectors';
export {
  BUSINESS_SECTOR_OPTIONS,
  businessSectorIcon,
  businessSectorLabel,
  filterBusinessSectors,
  suggestCommerceModeForSector,
} from '@/features/business-center/constants/sectors';

export type { BusinessShopPayCtaSpec } from '@/features/business-center/constants/shopCta';
export {
  businessShopHotelPath,
  businessShopProductPath,
  resolveBusinessShopHotelCta,
  resolveBusinessShopProductCta,
} from '@/features/business-center/constants/shopCta';

export type { BusinessCommissionContext, BusinessCommissionKind } from '@/features/business-center/constants/commission';
export {
  BUSINESS_GROWTH_COMMISSION_RATE,
  BUSINESS_GROWTH_PERIOD_DAYS,
  BUSINESS_HOTEL_COMMISSION_RATE,
  BUSINESS_MIN_COMMISSION_CENTS,
  BUSINESS_MIN_COMMISSION_HIGH_CENTS,
  BUSINESS_PREMIUM_RATE_DISCOUNT,
  BUSINESS_PRODUCT_COMMISSION_RATE,
  businessCommissionBreakdown,
  businessCommissionPolicySummary,
  businessCommissionContextFromAccount,
  formatCommissionRatePct,
  isBusinessGrowthPeriod,
  resolveBusinessCommissionRate,
} from '@/features/business-center/constants/commission';

export {
  SHOP_BOOST_ACCENT,
  SHOP_BOOST_GROWTH_DISCOUNT_RATE,
  SHOP_BOOST_MAX_SLOTS,
  SHOP_BOOST_PACKAGES,
  SHOP_BOOST_SCOPE_OPTIONS,
  computeShopBoostPrice,
  formatShopBoostPrice,
  formatShopBoostRemaining,
  shopBoostPackage,
  shopBoostScopeLabel,
  shopBoostTierLabel,
} from '@/features/business-center/constants/shopBoost';
