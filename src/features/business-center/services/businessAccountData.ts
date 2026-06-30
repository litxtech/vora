import type { BusinessCommerceMode } from '@/features/business-center/types';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import { fetchOwnerListingsForHub } from '@/features/business-center/services/businessShopData';
import { fetchHotelListings } from '@/features/hotel-center/services/hotelData';
import { fetchHotelOwnerEarnings } from '@/features/hotel-center/services/ownerEarnings';
import { computeSellerEarningsSummary } from '@/features/marketplace/services/sellerEarnings';
import { fetchSellerSales } from '@/features/marketplace/services/sellerSalesData';
import { fetchOwnerReservations } from '@/features/hotel-center/services/hotelReservations';
import type { BusinessHubStats } from '@/features/business-center/types';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';

export type UpdateBusinessShopInput = {
  commerceMode?: BusinessCommerceMode;
  category?: string;
  shopTagline?: string | null;
  shopAccent?: string | null;
  shopPublished?: boolean;
  shopShowOnPersonal?: boolean;
  description?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  district?: string | null;
};

export async function updateBusinessShopSettings(
  businessId: string,
  ownerId: string,
  input: UpdateBusinessShopInput,
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = {};
  if (input.commerceMode !== undefined) patch.commerce_mode = input.commerceMode;
  if (input.category !== undefined) patch.category = input.category;
  if (input.shopTagline !== undefined) patch.shop_tagline = input.shopTagline;
  if (input.shopAccent !== undefined) patch.shop_accent = input.shopAccent;
  if (input.shopPublished !== undefined) patch.shop_published = input.shopPublished;
  if (input.shopShowOnPersonal !== undefined) patch.shop_show_on_personal = input.shopShowOnPersonal;
  if (input.description !== undefined) patch.description = input.description;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.website !== undefined) patch.website = input.website;
  if (input.address !== undefined) patch.address = input.address;
  if (input.district !== undefined) patch.district = input.district;

  if (!Object.keys(patch).length) return { error: null };

  const { error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', businessId)
    .eq('owner_id', ownerId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function linkHotelsToBusiness(businessId: string, ownerId: string): Promise<void> {
  await supabase
    .from('hotel_listings')
    .update({ business_id: businessId })
    .eq('owner_id', ownerId)
    .is('business_id', null);
}

export async function fetchBusinessHubStats(
  ownerId: string,
  regionId: string | null,
): Promise<BusinessHubStats> {
  const resolvedRegion = resolveMarketplaceRegionId(regionId);
  const business = await fetchBusinessAccountByOwner(ownerId);

  const [listings, sellerSales, hotels, earnings, reservations] = await Promise.all([
    fetchOwnerListingsForHub(ownerId, resolvedRegion),
    fetchSellerSales(ownerId),
    fetchHotelListings('mine', resolvedRegion, ownerId),
    fetchHotelOwnerEarnings(ownerId),
    fetchOwnerReservations(ownerId),
  ]);

  const sellerSummary = computeSellerEarningsSummary(sellerSales);
  const businessListings = business
    ? listings.filter((l) => l.businessId === business.id || !l.businessId)
    : listings;

  return {
    productCount: businessListings.length,
    activeProducts: businessListings.filter((l) => l.status === 'active' || l.status === 'reserved').length,
    hotelCount: hotels.filter((h) => h.status === 'published').length,
    netEarningsCents: sellerSummary.netCents + (earnings.netCents ?? 0),
    pendingPayoutCents: sellerSummary.pendingPayoutCents + (earnings.pendingPayoutCents ?? 0),
    reservationCount: reservations.length,
  };
}
