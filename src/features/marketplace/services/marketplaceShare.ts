import { Linking, Platform, Share } from 'react-native';
import {
  buildMarketplaceListingDeepLink,
  buildMarketplaceListingShareUrl,
} from '@/lib/sharing/constants';
import { openUrl } from '@/lib/linking/openUrl';
import { listingDetailPath, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { exportListingPdf } from '@/features/marketplace/services/listingPdfExport';
import { buildListingShareMessage } from '@/features/marketplace/services/listingShareMessage';
import { toUserFacingError } from '@/lib/errors';

export { buildListingShareMessage } from '@/features/marketplace/services/listingShareMessage';

export async function shareMarketplaceListingLink(listing: MarketplaceListing): Promise<void> {
  const message = buildListingShareMessage(listing, true);
  const url = buildMarketplaceListingShareUrl(listing.id, true);
  await Share.share(
    Platform.OS === 'ios'
      ? { message, url, title: listing.title }
      : { message, title: listing.title },
  );
}

export async function shareMarketplaceListingWhatsApp(listing: MarketplaceListing): Promise<{ error: string | null }> {
  const message = buildListingShareMessage(listing, true);
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await openUrl(whatsappUrl);
      return { error: null };
    }
    await Share.share({ message, title: listing.title });
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'WhatsApp paylaşımı açılamadı.',
      }),
    };
  }
}

export async function shareMarketplaceListingPdf(
  listing: MarketplaceListing,
): Promise<{ error: string | null; usedTextFallback?: boolean }> {
  const pdfResult = await exportListingPdf(listing);
  if (!pdfResult.error) return { error: null };

  if (pdfResult.fallbackMessage) {
    try {
      await Share.share({ message: pdfResult.fallbackMessage, title: listing.title });
      return { error: null, usedTextFallback: true };
    } catch (error) {
      return {
        error: toUserFacingError(error instanceof Error ? error.message : pdfResult.error, {
          fallback: pdfResult.error ?? 'Paylaşım tamamlanamadı.',
        }),
      };
    }
  }

  return { error: pdfResult.error };
}

export function marketplaceListingInAppPath(listingId: string, buy = false): string {
  return buy ? `${listingDetailPath(listingId)}?buy=1` : listingDetailPath(listingId);
}

export function marketplaceListingDeepLink(listingId: string, buy = false): string {
  return buildMarketplaceListingDeepLink(listingId, buy);
}

export const MARKETPLACE_SHARE_ACCENT = MARKETPLACE_ACCENT;
