import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  voraPdfFooter,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';
import type { WalletActivityItem } from '@/features/wallet/types';
import {
  formatActivityAmount,
  formatActivityFullDate,
  WALLET_ACTIVITY_STATUS_LABELS,
  WALLET_SECTOR_META,
} from '@/features/wallet/utils/activityLabels';

function walletPdfHeader(item: WalletActivityItem): string {
  const sector = WALLET_SECTOR_META[item.sector];
  return `
  <div class="brand">
    <div class="brand-logo">VORA</div>
    <div class="brand-meta">
      <div class="brand-app">Vora Cüzdan</div>
      <div class="brand-sub">${escapePdfHtml(sector.label)} · Hesap Hareketi</div>
    </div>
  </div>
  <h1>${escapePdfHtml(item.title)}</h1>
  <p class="muted">${escapePdfHtml(item.subtitle)}</p>`;
}

function detailRowsHtml(item: WalletActivityItem): string {
  const rows = [
    { label: 'Sektör', value: WALLET_SECTOR_META[item.sector].label },
    { label: 'Para birimi', value: item.currency === 'points' ? 'Güven puanı' : 'TRY' },
    {
      label: 'Tutar',
      value: formatActivityAmount(item),
      emphasize: true,
    },
    { label: 'Transfer durumu', value: WALLET_ACTIVITY_STATUS_LABELS[item.status] },
    { label: 'İşlem tarihi', value: formatActivityFullDate(item.occurredAt) },
    ...item.details.map((field) => ({
      label: field.label,
      value: field.value,
      emphasize: field.emphasize,
    })),
  ];

  return rows
    .map(
      (row) => `
    <tr>
      <th>${escapePdfHtml(row.label)}</th>
      <td${row.emphasize ? ' style="font-weight:700"' : ''}>${escapePdfHtml(row.value)}</td>
    </tr>`,
    )
    .join('');
}

export async function exportWalletActivityPdf(item: WalletActivityItem): Promise<{ error: string | null }> {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${VORA_PDF_STYLES}</style></head><body>
  ${walletPdfHeader(item)}
  <h2>Hareket detayı</h2>
  <table>
    ${detailRowsHtml(item)}
  </table>
  <p class="muted">Belge no: ${escapePdfHtml(item.id)} · Oluşturulma: ${escapePdfHtml(formatPdfDate(new Date().toISOString()))}</p>
  <p class="muted">Bu belge Vora Cüzdan hesap hareketi özetidir.</p>
  ${voraPdfFooter()}
</body></html>`;

  const shortTitle = item.title.length > 32 ? `${item.title.slice(0, 32)}…` : item.title;
  return printAndShareHtml(html, `${shortTitle} · Vora Cüzdan`);
}
