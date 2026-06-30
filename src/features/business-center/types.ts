import type { MarketplaceListing } from '@/features/marketplace/types';
import type { HotelListing } from '@/features/hotel-center/types';

export type BusinessCommerceMode = 'none' | 'ecommerce' | 'hotel' | 'both' | 'showcase';

export type BusinessRegistrationStatus = 'pending' | 'approved' | 'rejected';

export type BusinessAccountRecord = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  district: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  regionId: string;
  ownerId: string;
  registrationStatus: BusinessRegistrationStatus;
  registrationApprovedAt: string | null;
  ownerIsPremium: boolean;
  commerceMode: BusinessCommerceMode;
  shopTagline: string | null;
  shopAccent: string | null;
  shopPublished: boolean;
  shopShowOnPersonal: boolean;
  latitude: number | null;
  longitude: number | null;
  viewCount: number;
};

export type BusinessShopProduct = MarketplaceListing & {
  businessName?: string | null;
  businessLogoUrl?: string | null;
};

export type BusinessShopHotel = Pick<
  HotelListing,
  'id' | 'name' | 'district' | 'pricePerNight' | 'currency' | 'coverUrl' | 'studentDiscountPct' | 'ratingAvg' | 'reviewCount'
>;

export type BusinessShopSnapshot = {
  business: BusinessAccountRecord;
  products: BusinessShopProduct[];
  hotels: BusinessShopHotel[];
};

export type BusinessHubStats = {
  productCount: number;
  activeProducts: number;
  hotelCount: number;
  netEarningsCents: number;
  pendingPayoutCents: number;
  reservationCount: number;
};

export type BusinessShopShowcaseKind = 'product' | 'hotel';

export type BusinessShopShowcaseItem = {
  id: string;
  businessId: string;
  itemKind: BusinessShopShowcaseKind;
  itemId: string;
  sortOrder: number;
  isVisible: boolean;
};

export type BusinessShopBrowseItem = {
  id: string;
  name: string;
  category: string;
  logoUrl: string | null;
  coverUrl: string | null;
  shopTagline: string | null;
  shopAccent: string | null;
  commerceMode: BusinessCommerceMode;
  isVerified: boolean;
  district: string | null;
  productCount: number;
  hotelCount: number;
  isFeatured?: boolean;
  boostId?: string | null;
};

export type ShopBoostTier = 'starter' | 'standard' | 'premium';
export type ShopBoostScope = 'region' | 'karadeniz';

export type ShopBoostShowcaseItem = {
  kind: 'product' | 'hotel';
  id: string;
  title: string;
  priceCents: number | null;
  imageUrl: string | null;
};

export type BusinessShopBoostActive = {
  boostId: string;
  businessId: string;
  packageTier: ShopBoostTier;
  regionScope: ShopBoostScope;
  endsAt: string;
  showcaseItems: ShopBoostShowcaseItem[];
  name: string;
  category: string;
  logoUrl: string | null;
  coverUrl: string | null;
  shopTagline: string | null;
  shopAccent: string | null;
  commerceMode: BusinessCommerceMode;
  isVerified: boolean;
  district: string | null;
};

export type ShopBoostSlotsInfo = {
  regionKey: string;
  used: number;
  max: number;
  available: number;
};

export type ShopBoostStatus =
  | { active: false }
  | {
      active: true;
      boostId: string;
      packageTier: ShopBoostTier;
      regionScope: ShopBoostScope;
      startsAt: string;
      endsAt: string;
      impressions: number;
      shopViews: number;
    };
