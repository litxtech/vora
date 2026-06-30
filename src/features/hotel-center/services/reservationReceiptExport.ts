import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  voraPdfFooter,
  voraPdfHeader,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';
import { HOTEL_RESERVATION_STATUS_LABELS } from '@/features/hotel-center/constants';
import type { HotelReservation } from '@/features/hotel-center/types';

function formatTry(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺`;
}

function formatStayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export async function exportHotelReservationReceiptPdf(
  reservation: HotelReservation,
  role: 'owner' | 'guest',
): Promise<{ error: string | null }> {
  const title = 'Rezervasyon Özeti';
  const subtitle = `${reservation.reservationCode} · ${HOTEL_RESERVATION_STATUS_LABELS[reservation.status]}`;
  const commission = reservation.commissionCents ?? Math.round(reservation.grossAmountCents * 0.12);
  const ownerNet = reservation.ownerPayoutCents ?? reservation.grossAmountCents - commission;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${VORA_PDF_STYLES}</style></head><body>
  ${voraPdfHeader(title, subtitle)}
  <div class="summary">
    <div><strong>Otel:</strong> ${escapePdfHtml(reservation.hotelName ?? '—')}</div>
    <div><strong>Rezervasyon kodu:</strong> ${escapePdfHtml(reservation.reservationCode)}</div>
    ${role === 'owner' && reservation.guestName ? `<div><strong>Misafir:</strong> ${escapePdfHtml(reservation.guestName)}</div>` : ''}
    ${role === 'owner' && reservation.guestPhone ? `<div><strong>Telefon:</strong> ${escapePdfHtml(reservation.guestPhone)}</div>` : ''}
    <div><strong>Giriş:</strong> ${escapePdfHtml(formatStayDate(reservation.checkIn))}</div>
    <div><strong>Çıkış:</strong> ${escapePdfHtml(formatStayDate(reservation.checkOut))}</div>
    <div><strong>Gece:</strong> ${reservation.nights}</div>
    <div><strong>Kişi:</strong> ${reservation.guestsCount}</div>
    <div><strong>Brüt tutar:</strong> ${escapePdfHtml(formatTry(reservation.grossAmountCents))}</div>
    ${role === 'owner' ? `<div><strong>Platform komisyonu:</strong> ${escapePdfHtml(formatTry(commission))}</div>` : ''}
    ${role === 'owner' ? `<div><strong>İşletme net:</strong> ${escapePdfHtml(formatTry(ownerNet))}</div>` : ''}
    ${reservation.studentDiscountPct > 0 ? `<div><strong>Öğrenci indirimi:</strong> %${reservation.studentDiscountPct}</div>` : ''}
    ${reservation.guestNote ? `<div><strong>Misafir notu:</strong> ${escapePdfHtml(reservation.guestNote)}</div>` : ''}
    <div><strong>Ödeme:</strong> ${escapePdfHtml(reservation.paymentStatus === 'at_hotel' ? 'Otelde ödenecek' : reservation.paidAt ? formatPdfDate(reservation.paidAt) : '—')}</div>
    <div><strong>Oluşturulma:</strong> ${escapePdfHtml(formatPdfDate(reservation.createdAt))}</div>
  </div>
  <p class="muted">Bu belge Vora Otel Merkezi rezervasyon kaydıdır. Ödeme konaklama sırasında otelde yapılır.</p>
  ${voraPdfFooter()}
</body></html>`;

  return printAndShareHtml(html, `${reservation.reservationCode} · Vora Otel`);
}
