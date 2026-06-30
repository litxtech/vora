import { formatCents, ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import type { MarketplaceOrder, MarketplaceOrderEvent } from '@/features/marketplace/types';
import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  voraPdfFooter,
  voraPdfHeader,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';

export async function exportMarketplaceOrderPdf(
  order: MarketplaceOrder,
  events: MarketplaceOrderEvent[],
): Promise<{ error: string | null }> {
  const eventRows = events
    .map(
      (e) =>
        `<tr><td>${escapePdfHtml(formatPdfDate(e.createdAt))}</td><td>${escapePdfHtml(e.eventType)}</td><td>${escapePdfHtml(e.actorRole ?? '—')}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${VORA_PDF_STYLES}</style></head><body>
  ${voraPdfHeader('Sipariş Özeti', `${order.orderNumber} · ${ORDER_STATUS_LABELS[order.status]}`)}
  <div class="summary">
    <div><strong>İlan:</strong> ${escapePdfHtml(order.listingTitle)}</div>
    <div><strong>Alıcı:</strong> ${escapePdfHtml(order.buyerName ?? '—')}</div>
    <div><strong>Satıcı:</strong> ${escapePdfHtml(order.sellerName ?? '—')}</div>
    <div><strong>Brüt tutar:</strong> ${escapePdfHtml(formatCents(order.grossAmountCents))}</div>
    <div><strong>Komisyon:</strong> ${escapePdfHtml(formatCents(order.commissionCents))}</div>
    <div><strong>Satıcı net:</strong> ${escapePdfHtml(formatCents(order.sellerNetCents))}</div>
    <div><strong>Ödeme tarihi:</strong> ${escapePdfHtml(formatPdfDate(order.paidAt))}</div>
    <div><strong>Ödeme vadesi:</strong> ${escapePdfHtml(formatPdfDate(order.payoutDueAt))}</div>
    <div><strong>Oluşturulma:</strong> ${escapePdfHtml(formatPdfDate(order.createdAt))}</div>
  </div>
  <h2>Süreç kayıtları</h2>
  <table>
    <thead><tr><th>Tarih</th><th>Olay</th><th>Rol</th></tr></thead>
    <tbody>${eventRows || '<tr><td colspan="3">Kayıt yok</td></tr>'}</tbody>
  </table>
  ${voraPdfFooter()}
</body></html>`;

  return printAndShareHtml(html, `${order.orderNumber} · Vora`);
}
