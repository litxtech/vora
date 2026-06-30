import {
  categoryLabel,
  formatMarketplacePrice,
  subcategoryLabel,
} from '@/features/marketplace/constants';
import { buildListingShareMessage } from '@/features/marketplace/services/listingShareMessage';
import type { MarketplaceListing } from '@/features/marketplace/types';
import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  shareTextAsFallback,
  voraPdfFooter,
  voraPdfHeader,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';

export async function exportListingPdf(
  listing: MarketplaceListing,
): Promise<{ error: string | null; fallbackMessage?: string }> {
  const price = formatMarketplacePrice(listing.price, listing.listingType, listing.currency);
  const buyMessage = buildListingShareMessage(listing, true);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  ${VORA_PDF_STYLES}
  .product { display: flex; gap: 16px; margin-top: 16px; align-items: flex-start; }
  .product img { width: 120px; height: 120px; object-fit: cover; border-radius: 12px; }
  .cta { margin-top: 20px; padding: 14px; background: #FFF3E0; border: 1px solid #FF9800; border-radius: 12px; font-size: 13px; font-weight: 700; color: #E65100; text-align: center; }
  .meta { font-size: 12px; line-height: 1.6; margin-top: 12px; }
</style></head><body>
  ${voraPdfHeader('Ürün Kartı', listing.title)}
  <div class="product">
    ${listing.coverUrl ? `<img src="${escapePdfHtml(listing.coverUrl)}" alt="" />` : ''}
    <div>
      <h1>${escapePdfHtml(listing.title)}</h1>
      <p class="muted">${escapePdfHtml(price)} · ${escapePdfHtml(listing.district)}</p>
      <p class="muted">${escapePdfHtml(categoryLabel(listing.category))} · ${escapePdfHtml(subcategoryLabel(listing.category, listing.subcategory))}</p>
    </div>
  </div>
  <div class="meta">
    <div><strong>Açıklama</strong></div>
    <div>${escapePdfHtml(listing.description.slice(0, 800))}</div>
  </div>
  ${
    listing.status === 'active' && listing.listingType !== 'free'
      ? `<div class="cta">🛒 Bu ürünü satın al — bağlantı mesajda</div>`
      : ''
  }
  <p class="muted" style="margin-top:12px">Oluşturulma: ${escapePdfHtml(formatPdfDate(listing.createdAt))}</p>
  ${voraPdfFooter()}
</body></html>`;

  const result = await printAndShareHtml(html, `${listing.title} · Vora`);
  if (!result.error) return { error: null };

  const textFallback = await shareTextAsFallback(buyMessage, `${listing.title} · Vora`);
  if (!textFallback.error) {
    return { error: null, fallbackMessage: buyMessage };
  }

  return { error: result.error, fallbackMessage: buyMessage };
}
