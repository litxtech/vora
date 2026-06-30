import type { Ionicons } from '@expo/vector-icons';
import type { BusinessShopProduct } from '@/features/business-center/types';
import { listingSupportsSecureCheckout } from '@/features/marketplace/constants';

export type BusinessShopPayCtaSpec = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  securePayment: boolean;
};

export function businessShopHotelPath(hotelId: string, options?: { reserve?: boolean }): string {
  const base = `/detail/hotels/${hotelId}`;
  if (options?.reserve) return `${base}?reserve=1`;
  return base;
}

export function businessShopProductPath(
  productId: string,
  options?: { buy?: boolean; offer?: boolean },
): string {
  const base = `/detail/marketplace/${productId}`;
  const params = new URLSearchParams();
  if (options?.buy) params.set('buy', '1');
  if (options?.offer) params.set('offer', '1');
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function resolveBusinessShopHotelCta(hotelId: string): BusinessShopPayCtaSpec {
  return {
    label: 'Rezervasyon Yap',
    icon: 'calendar-outline',
    path: businessShopHotelPath(hotelId, { reserve: true }),
    securePayment: true,
  };
}

export function resolveBusinessShopProductCta(
  product: Pick<BusinessShopProduct, 'id' | 'status' | 'listingType' | 'price'>,
): BusinessShopPayCtaSpec {
  if (product.status !== 'active' && product.status !== 'reserved') {
    return {
      label: 'İncele',
      icon: 'eye-outline',
      path: businessShopProductPath(product.id),
      securePayment: false,
    };
  }

  if (product.listingType === 'free') {
    return {
      label: 'Ücretsiz Al',
      icon: 'gift-outline',
      path: businessShopProductPath(product.id),
      securePayment: false,
    };
  }

  if (product.listingType === 'trade') {
    return {
      label: 'Takas Teklifi',
      icon: 'swap-horizontal-outline',
      path: businessShopProductPath(product.id, { offer: true }),
      securePayment: false,
    };
  }

  if (listingSupportsSecureCheckout(product)) {
    return {
      label: 'Satın Al',
      icon: 'cart-outline',
      path: businessShopProductPath(product.id, { buy: true }),
      securePayment: true,
    };
  }

  return {
    label: product.listingType === 'negotiable' ? 'Teklif Ver' : 'Teklif Ver',
    icon: 'pricetag-outline',
    path: businessShopProductPath(product.id, { offer: true }),
    securePayment: false,
  };
}
