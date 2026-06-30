import { escapePdfHtml, formatPdfDate, printAndShareHtml } from '@/features/marketplace/services/pdfCore';
import { SCREEN_TIME_FEATURE_NAME } from '@/features/screen-time/constants';
import type { ScreenTimeSnapshot } from '@/features/screen-time/types';
import {
  formatDayLabel,
  formatDeltaPct,
  formatDuration,
  formatDurationCompact,
} from '@/features/screen-time/utils';

const ACCENT = '#16A34A';
const ACCENT_DARK = '#15803D';
const ACCENT_LIGHT = '#22C55E';

/** Ekran süresi raporu için modern, sade PDF stilleri. */
const SCREEN_TIME_PDF_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 0 28px 32px;
    color: #0F172A;
    background: #FFFFFF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hero {
    margin: 0 -28px 24px;
    padding: 32px 28px 28px;
    background: linear-gradient(135deg, ${ACCENT_DARK} 0%, ${ACCENT_LIGHT} 100%);
    color: #FFFFFF;
  }
  .hero-app { font-size: 12px; letter-spacing: 3px; font-weight: 700; opacity: 0.85; text-transform: uppercase; }
  .hero-title { font-size: 24px; font-weight: 800; margin: 6px 0 18px; }
  .hero-today-label { font-size: 12px; opacity: 0.85; }
  .hero-today-value { font-size: 40px; font-weight: 800; line-height: 1.1; margin-top: 2px; }
  .hero-meta { margin-top: 14px; font-size: 11px; opacity: 0.8; }

  .grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
  .stat {
    flex: 1 1 calc(50% - 6px);
    min-width: 200px;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 14px 16px;
    background: #F8FAFC;
  }
  .stat-label { font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 4px; }

  h2 { font-size: 14px; font-weight: 700; color: #0F172A; margin: 26px 0 10px; }

  .pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }
  .pill-good { background: #DCFCE7; color: ${ACCENT_DARK}; }
  .pill-bad { background: #FEE2E2; color: #B91C1C; }
  .pill-flat { background: #E2E8F0; color: #475569; }

  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 9px 10px; font-size: 12px; text-align: left; border-bottom: 1px solid #EEF2F6; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; font-weight: 700; }
  td.num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }

  .bar-cell { width: 45%; }
  .bar-track { height: 8px; border-radius: 999px; background: #EDF2F7; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; background: ${ACCENT}; }

  .note {
    margin-top: 22px;
    padding: 14px 16px;
    border-radius: 12px;
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    font-size: 11px;
    color: #166534;
    line-height: 1.5;
  }
  .footer { margin-top: 26px; padding-top: 14px; border-top: 1px solid #EEF2F6; font-size: 10px; color: #94A3B8; text-align: center; }
`;

function statCard(label: string, value: string): string {
  return `<div class="stat"><div class="stat-label">${escapePdfHtml(label)}</div><div class="stat-value">${escapePdfHtml(value)}</div></div>`;
}

function comparePill(deltaPct: number | null): string {
  if (deltaPct == null) return `<span class="pill pill-flat">—</span>`;
  const down = deltaPct < 0;
  const cls = deltaPct === 0 ? 'pill-flat' : down ? 'pill-good' : 'pill-bad';
  return `<span class="pill ${cls}">${escapePdfHtml(formatDeltaPct(deltaPct))}</span>`;
}

function dailyTable(snapshot: ScreenTimeSnapshot): string {
  const days = snapshot.days.slice(0, 30);
  if (days.length === 0) {
    return `<p style="font-size:12px;color:#64748B">Henüz kayıtlı gün yok.</p>`;
  }
  const max = Math.max(1, ...days.map((d) => d.seconds));
  const rows = days
    .map((d) => {
      const ratio = Math.max(2, Math.round((d.seconds / max) * 100));
      return `<tr>
        <td>${escapePdfHtml(formatDayLabel(d.date))}</td>
        <td class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${ratio}%"></div></div></td>
        <td class="num">${escapePdfHtml(formatDurationCompact(d.seconds))}</td>
      </tr>`;
    })
    .join('');
  return `<table>
    <thead><tr><th>Gün</th><th>Dağılım</th><th style="text-align:right">Süre</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildScreenTimeHtml(snapshot: ScreenTimeSnapshot): string {
  const dailyAverage = snapshot.trackedDays > 0 ? snapshot.totalSeconds / snapshot.trackedDays : 0;
  const goalSeconds = snapshot.goalMinutes != null ? snapshot.goalMinutes * 60 : null;
  const wow = snapshot.weekCompare;
  const generatedAt = formatPdfDate(new Date().toISOString());

  const goalRowHtml = goalSeconds
    ? `<tr><th>Günlük hedef</th><td>${escapePdfHtml(formatDuration(goalSeconds))} · ${
        snapshot.goalReachedToday ? 'bugün ulaşıldı' : 'henüz aşılmadı'
      }</td></tr>`
    : `<tr><th>Günlük hedef</th><td>Kapalı</td></tr>`;

  const busiestHtml = snapshot.busiestDay
    ? `<tr><th>En aktif gün</th><td>${escapePdfHtml(
        formatDayLabel(snapshot.busiestDay.date),
      )} · ${escapePdfHtml(formatDurationCompact(snapshot.busiestDay.seconds))}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>${SCREEN_TIME_PDF_STYLES}</style></head>
<body>
  <div class="hero">
    <div class="hero-app">Vora · ${escapePdfHtml(SCREEN_TIME_FEATURE_NAME)}</div>
    <div class="hero-title">Ekran Süresi Raporu</div>
    <div class="hero-today-label">Bugün uygulamada</div>
    <div class="hero-today-value">${escapePdfHtml(formatDuration(snapshot.todaySeconds))}</div>
    <div class="hero-meta">Oluşturulma: ${escapePdfHtml(generatedAt)}</div>
  </div>

  <div class="grid">
    ${statCard('Son 7 gün', formatDuration(snapshot.weekSeconds))}
    ${statCard('Toplam', formatDuration(snapshot.totalSeconds))}
    ${statCard('Günlük ortalama', formatDuration(dailyAverage))}
    ${statCard('Takip edilen gün', `${snapshot.trackedDays}`)}
  </div>

  <h2>Bu hafta vs geçen hafta ${comparePill(wow.deltaPct)}</h2>
  <table>
    <tr><th>Bu hafta</th><td>${escapePdfHtml(formatDuration(wow.thisWeekSeconds))}</td></tr>
    <tr><th>Geçen hafta</th><td>${escapePdfHtml(formatDuration(wow.lastWeekSeconds))}</td></tr>
  </table>

  <h2>Rekorlar &amp; oturumlar</h2>
  <table>
    <tr><th>Bugünkü açılış</th><td>${snapshot.todayOpens} kez</td></tr>
    <tr><th>Toplam açılış</th><td>${snapshot.totalOpens} kez</td></tr>
    <tr><th>Ortalama oturum</th><td>${escapePdfHtml(formatDuration(snapshot.averageSessionSeconds))}</td></tr>
    <tr><th>En uzun oturum</th><td>${escapePdfHtml(formatDuration(snapshot.longestSessionSeconds))}</td></tr>
    <tr><th>Güncel seri</th><td>${snapshot.currentStreak} gün</td></tr>
    <tr><th>En uzun seri</th><td>${snapshot.longestStreak} gün</td></tr>
    ${busiestHtml}
    ${goalRowHtml}
  </table>

  <h2>Günlük döküm</h2>
  ${dailyTable(snapshot)}

  <div class="note">
    Bu rapor yalnızca bu cihazda tutulan ekran süresi verisinden üretildi. Veriler hiçbir sunucuya gönderilmez;
    ölçüm sadece uygulama ön plandayken yapılır.
  </div>

  <div class="footer">Vora · ${escapePdfHtml(SCREEN_TIME_FEATURE_NAME)} · ${escapePdfHtml(generatedAt)}</div>
</body></html>`;
}

/** Ekran süresi özetini temiz, modern bir PDF olarak oluşturup paylaşır. */
export async function exportScreenTimePdf(
  snapshot: ScreenTimeSnapshot,
): Promise<{ error: string | null }> {
  const html = buildScreenTimeHtml(snapshot);
  return printAndShareHtml(html, `${SCREEN_TIME_FEATURE_NAME} Raporu · Vora`);
}
