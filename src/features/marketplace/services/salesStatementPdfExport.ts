import { formatCents, MARKETPLACE_COMMISSION_RATE, ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import type { MarketplaceOrder, SellerSaleRecord } from '@/features/marketplace/types';
import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  voraPdfFooter,
  voraPdfHeader,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';
import { computeSellerEarningsSummary } from '@/features/marketplace/services/sellerEarnings';

function buildBuyerOrderRows(orders: MarketplaceOrder[]): string {
  return orders
    .map((o) => {
      const date = formatPdfDate(o.paidAt ?? o.createdAt);
      return `<tr>
        <td>${escapePdfHtml(date)}</td>
        <td>${escapePdfHtml(o.listingTitle)}</td>
        <td>${escapePdfHtml(o.sellerName ?? '—')}</td>
        <td>${escapePdfHtml(formatCents(o.grossAmountCents))}</td>
        <td>${escapePdfHtml(ORDER_STATUS_LABELS[o.status])}</td>
        <td>${escapePdfHtml(o.orderNumber)}</td>
      </tr>`;
    })
    .join('');
}

function buildSellerSaleRows(sales: SellerSaleRecord[]): string {
  return sales
    .map((s) => {
      const date = formatPdfDate(s.soldAt);
      const type = s.source === 'manual' ? 'Manuel' : 'Platform';
      return `<tr>
        <td>${escapePdfHtml(date)}</td>
        <td>${escapePdfHtml(s.listingTitle)}</td>
        <td>${escapePdfHtml(type)}</td>
        <td>${escapePdfHtml(s.buyerName ?? '—')}</td>
        <td>${escapePdfHtml(formatCents(s.grossAmountCents, s.currency))}</td>
        <td>${escapePdfHtml(formatCents(s.commissionCents, s.currency))}</td>
        <td>${escapePdfHtml(formatCents(s.sellerNetCents, s.currency))}</td>
        <td>${escapePdfHtml(s.statusLabel)}</td>
      </tr>`;
    })
    .join('');
}

export async function exportSellerSalesPdf(
  sales: SellerSaleRecord[],
  userName?: string | null,
): Promise<{ error: string | null }> {
  const summary = computeSellerEarningsSummary(sales);
  const commissionPct = Math.round(MARKETPLACE_COMMISSION_RATE * 100);
  const subtitle = userName
    ? `${userName} · ${summary.saleCount} satış`
    : `${summary.saleCount} satış`;

  const totalsLine = `Brüt ${formatCents(summary.grossCents)} · Komisyon (%${commissionPct}) −${formatCents(summary.commissionCents)} · Net ${formatCents(summary.netCents)} · Yatırılan ${formatCents(summary.paidOutCents)} · Bekleyen ${formatCents(summary.pendingPayoutCents)}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${VORA_PDF_STYLES}</style></head><body>
  ${voraPdfHeader('Satış & Kazanç Özeti', subtitle)}
  <div class="totals">${escapePdfHtml(totalsLine)}</div>
  <p class="muted">Manuel satış: ${summary.manualSaleCount} · Platform siparişi: ${summary.platformSaleCount}</p>
  <h2>Satış dökümü</h2>
  <table>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>Ürün</th>
        <th>Tip</th>
        <th>Alıcı</th>
        <th>Brüt</th>
        <th>Komisyon</th>
        <th>Net</th>
        <th>Durum</th>
      </tr>
    </thead>
    <tbody>${buildSellerSaleRows(sales) || '<tr><td colspan="8">Kayıt yok</td></tr>'}</tbody>
  </table>
  ${voraPdfFooter()}
</body></html>`;

  return printAndShareHtml(html, 'Vora Satış Özeti');
}

export async function exportMarketplaceStatementPdf(
  orders: MarketplaceOrder[],
  kind: 'buyer',
  userName?: string | null,
): Promise<{ error: string | null }> {
  let total = 0;
  let count = 0;
  for (const o of orders) {
    if (o.status === 'cancelled' || o.status === 'refunded') continue;
    count += 1;
    total += o.grossAmountCents;
  }

  const title = 'Alış Özeti';
  const subtitle = userName ? `${userName} · ${orders.length} kayıt` : `${orders.length} kayıt`;
  const totalsLine = `Toplam ${count} alış · Harcama ${formatCents(total)}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${VORA_PDF_STYLES}</style></head><body>
  ${voraPdfHeader(title, subtitle)}
  <div class="totals">${escapePdfHtml(totalsLine)}</div>
  <h2>İşlem listesi</h2>
  <table>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>Ürün</th>
        <th>Satıcı</th>
        <th>Tutar</th>
        <th>Durum</th>
        <th>Sipariş no</th>
      </tr>
    </thead>
    <tbody>${buildBuyerOrderRows(orders) || '<tr><td colspan="6">Kayıt yok</td></tr>'}</tbody>
  </table>
  ${voraPdfFooter()}
</body></html>`;

  return printAndShareHtml(html, `Vora ${title}`);
}
