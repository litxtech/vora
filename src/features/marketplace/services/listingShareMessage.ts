import {
  formatMarketplacePrice,
} from '@/features/marketplace/constants';
import { buildMarketplaceListingShareUrl } from '@/lib/sharing/constants';
import type { MarketplaceListing } from '@/features/marketplace/types';

export function buildListingShareMessage(listing: MarketplaceListing, buyLink = true): string {
  const price = formatMarketplacePrice(listing.price, listing.listingType, listing.currency);
  const url = buildMarketplaceListingShareUrl(listing.id, buyLink);
  const lines = [
    `🛒 ${listing.title}`,
    price,
    listing.district ? `📍 ${listing.district}` : null,
    '',
    buyLink && listing.status === 'active' && listing.listingType !== 'free'
      ? '👉 Bu ürünü satın al:'
      : '👉 İlanı görüntüle:',
    url,
    '',
    'Vora · Yerel Pazar',
  ].filter((line) => line !== null);

  return lines.join('\n');
}
