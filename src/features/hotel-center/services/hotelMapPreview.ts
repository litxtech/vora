import { discountedPrice, formatHotelPrice, amenityLabel } from '@/features/hotel-center/constants';
import { fetchHotelDetail } from '@/features/hotel-center/services/hotelData';
import type { HotelListingDetail } from '@/features/hotel-center/types';

export type HotelMapPreview = {
  hotel: HotelListingDetail;
  discountedPrice: number;
  hasDiscount: boolean;
};

export async function fetchHotelMapPreview(hotelId: string): Promise<HotelMapPreview | null> {
  const hotel = await fetchHotelDetail(hotelId, null);
  if (!hotel || hotel.latitude == null || hotel.longitude == null) return null;
  const hasDiscount = hotel.studentDiscountPct > 0;
  return {
    hotel,
    hasDiscount,
    discountedPrice: discountedPrice(hotel.pricePerNight, hotel.studentDiscountPct),
  };
}

export function hotelMapPreviewSubtitle(hotel: HotelListingDetail): string {
  const parts: string[] = [];
  if (hotel.reviewCount > 0) parts.push(`⭐ ${hotel.avgRating.toFixed(1)} (${hotel.reviewCount})`);
  if (hotel.studentDiscountPct > 0) parts.push(`🎓 -%${hotel.studentDiscountPct}`);
  parts.push(`Vora özel ${formatHotelPrice(hotel.pricePerNight)}/gece`);
  return parts.join(' · ');
}

export function hotelAmenityLabels(amenities: string[]): string {
  return amenities.slice(0, 4).map(amenityLabel).join(' · ');
}
