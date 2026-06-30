import {
  formatContribution,
  rideCityName,
  TRIP_STATUS_LABELS,
} from '@/features/rides/constants';
import type { RideReservation, RideTrip } from '@/features/rides/types';
import { formatRideDeparture, isoToRideDateDisplay } from '@/features/rides/utils/dateFormat';
import {
  escapePdfHtml,
  formatPdfDate,
  printAndShareHtml,
  voraPdfFooter,
  voraPdfHeader,
  VORA_PDF_STYLES,
} from '@/features/marketplace/services/pdfCore';

const VORA_RIDES_LABEL = 'Paylaşımlı Yolculuk';

function ridesPdfHeader(title: string, subtitle?: string): string {
  return voraPdfHeader(title, subtitle ? `${VORA_RIDES_LABEL} · ${subtitle}` : VORA_RIDES_LABEL);
}

export async function exportTripTicketPdf(
  trip: RideTrip,
  reservation?: RideReservation | null,
): Promise<{ error: string | null }> {
  const route = `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`;
  const stops = trip.stops?.map((s) => rideCityName(s.cityId)).join(', ') ?? '';
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  ${VORA_PDF_STYLES}
  .route { font-size: 22px; font-weight: 900; color: #2196F3; margin: 12px 0; }
  .badge { display: inline-block; padding: 4px 10px; background: #E3F2FD; color: #1565C0; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
</style></head><body>
  ${ridesPdfHeader('Yolculuk Bileti', route)}
  <div class="route">${escapePdfHtml(route)}</div>
  ${stops ? `<p class="muted">Ara duraklar: ${escapePdfHtml(stops)}</p>` : ''}
  <div class="row"><span>Tarih</span><strong>${escapePdfHtml(formatRideDeparture(trip.departureDate, trip.departureTime))}</strong></div>
  <div class="row"><span>Kişi başı katkı</span><strong>${escapePdfHtml(formatContribution(trip.contributionCents))}</strong></div>
  <div class="row"><span>Durum</span><span class="badge">${escapePdfHtml(TRIP_STATUS_LABELS[trip.status])}</span></div>
  ${trip.meetingPoint ? `<div class="row"><span>Buluşma</span><span>${escapePdfHtml(trip.meetingPoint)}</span></div>` : ''}
  ${reservation ? `<div class="row"><span>Koltuk</span><strong>${reservation.seatCount}</strong></div>
  <div class="row"><span>Toplam katkı</span><strong>${escapePdfHtml(formatContribution(reservation.amountCents))}</strong></div>` : ''}
  <p class="muted" style="margin-top:16px">Bu belge paylaşımlı yolculuk katkı makbuzudur — ticari taşıma hizmeti değildir.</p>
  ${voraPdfFooter()}
</body></html>`;

  const result = await printAndShareHtml(html, `${route} · Vora Yolculuk`);
  return { error: result.error };
}

export async function exportEarningsStatementPdf(
  trips: RideTrip[],
  totalNetCents: number,
): Promise<{ error: string | null }> {
  const rows = trips
    .filter((t) => t.status === 'completed')
    .map(
      (t) =>
        `<tr><td>${escapePdfHtml(rideCityName(t.fromCityId))} → ${escapePdfHtml(rideCityName(t.toCityId))}</td>
        <td>${escapePdfHtml(isoToRideDateDisplay(t.departureDate))}</td>
        <td>${escapePdfHtml(formatContribution(t.contributionCents))}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${VORA_PDF_STYLES} table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background: #E3F2FD; }</style></head><body>
  ${ridesPdfHeader('Kazanç Dökümü')}
  <p><strong>Net kazanç:</strong> ${escapePdfHtml(formatContribution(totalNetCents))}</p>
  <table><thead><tr><th>Rota</th><th>Tarih</th><th>Katkı</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="muted">Oluşturulma: ${escapePdfHtml(formatPdfDate(new Date().toISOString()))}</p>
  ${voraPdfFooter()}
</body></html>`;

  const result = await printAndShareHtml(html, 'Vora Yolculuk Kazanç');
  return { error: result.error };
}
