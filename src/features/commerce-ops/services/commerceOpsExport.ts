import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';
import {
  COMMERCE_OPS_TABS,
  formatCommerceCents,
  MODULE_LABELS,
} from '@/features/commerce-ops/constants';
import type { CommerceOpsSummary, CommerceTransactionRow } from '@/features/commerce-ops/types';

function commercePdfHeader(title: string, subtitle?: string): string {
  return `
  <div class="brand">
    <div class="brand-logo">VORA</div>
    <div class="brand-meta">
      <div class="brand-app">Ekonomi Operasyon Merkezi</div>
      <div class="brand-sub">${escapePdfHtml(title)}</div>
    </div>
  </div>
  ${subtitle ? `<p class="muted">${escapePdfHtml(subtitle)}</p>` : ''}`;
}

function summaryRows(summary: CommerceOpsSummary): string {
  return `
    <div class="summary">
      <div><strong>Otel onaylı:</strong> ${summary.hotelConfirmed}</div>
      <div><strong>Otel ödeme bekleyen:</strong> ${summary.hotelPayoutDue}</div>
      <div><strong>Otel komisyon (24s):</strong> ${formatCommerceCents(summary.hotelCommission24hCents)}</div>
      <div><strong>Pazar escrow:</strong> ${formatCommerceCents(summary.marketplaceEscrowCents)}</div>
      <div><strong>Yolculuk escrow:</strong> ${formatCommerceCents(summary.ridesEscrowCents)}</div>
      <div><strong>Toplam escrow:</strong> ${formatCommerceCents(summary.totalEscrowCents)}</div>
      <div><strong>24s işlem:</strong> ${summary.transactions24h}</div>
      <div><strong>Personel başvuru bekleyen:</strong> ${summary.personnelApplicationsPending}</div>
    </div>`;
}

function transactionTable(rows: CommerceTransactionRow[]): string {
  if (!rows.length) return '<p class="muted">Kayıt yok.</p>';
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${escapePdfHtml(MODULE_LABELS[r.module])}</td>
        <td>${escapePdfHtml(r.referenceCode)}</td>
        <td>${escapePdfHtml(r.title)}</td>
        <td>${escapePdfHtml(r.fromPartyName)}</td>
        <td>${escapePdfHtml(r.toPartyName)}</td>
        <td>${formatCommerceCents(r.grossCents)}</td>
        <td>${escapePdfHtml(r.status)}</td>
        <td>${formatPdfDate(r.createdAt)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table>
      <thead>
        <tr>
          <th>Modül</th><th>Kod</th><th>Başlık</th><th>Kimden</th><th>Kime</th><th>Tutar</th><th>Durum</th><th>Tarih</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

export async function exportCommerceOpsPdf(
  summary: CommerceOpsSummary | null,
  transactions: CommerceTransactionRow[],
  tabLabel: string,
): Promise<{ error: string | null }> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${VORA_PDF_STYLES}</style></head><body>
    ${commercePdfHeader('Operasyon Raporu', tabLabel)}
    ${summary ? `<h2>Özet</h2>${summaryRows(summary)}` : ''}
    <h2>İşlemler (${transactions.length})</h2>
    ${transactionTable(transactions)}
    <div class="footer">Oluşturulma: ${escapePdfHtml(formatPdfDate(new Date().toISOString()))}</div>
  </body></html>`;

  return printAndShareHtml(html, 'Operasyon Raporu');
}

export function commerceTabLabel(tabId: string): string {
  return COMMERCE_OPS_TABS.find((t) => t.id === tabId)?.label ?? tabId;
}
