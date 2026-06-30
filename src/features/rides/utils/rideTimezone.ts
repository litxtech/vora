const ISTANBUL_TZ = 'Europe/Istanbul';
const ISTANBUL_OFFSET = '+03:00';

/** YYYY-MM-DD — uygulama saat dilimi (İstanbul). */
export function istanbulTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ISTANBUL_TZ }).format(new Date());
}

/** YYYY-MM-DD — Postgres date / ISO datetime karışımını düzeltir. */
export function normalizeRideDepartureDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/** SS:DD → HH:MM:SS (PostgreSQL time). */
export function normalizeRideDepartureTime(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '09:00:00';
  const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

/** Kalkış anı İstanbul saatine göre gelecekte mi? */
export function isFutureRideDeparture(isoDate: string, time: string): boolean {
  const date = normalizeRideDepartureDate(isoDate);
  if (!date) return false;
  const hhmm = normalizeRideDepartureTime(time).slice(0, 5);
  const departureMs = Date.parse(`${date}T${hhmm}:00${ISTANBUL_OFFSET}`);
  if (Number.isNaN(departureMs)) return false;
  return departureMs > Date.now();
}

export function istanbulDatePlusDaysIso(days: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');

  const local = new Date(Date.UTC(year, month - 1, day));
  local.setUTCDate(local.getUTCDate() + days);

  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
