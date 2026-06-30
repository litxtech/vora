import {
  formatBirthDateInput,
  isoToDisplayBirthDate,
  parseBirthDate,
  toISODate,
} from '@/features/auth/services/validation';
import {
  isFutureRideDeparture,
  normalizeRideDepartureDate,
  normalizeRideDepartureTime,
  istanbulTodayIso,
} from '@/features/rides/utils/rideTimezone';

/** GG.AA.YYYY → YYYY-MM-DD */
export function rideDateToIso(display: string): string | null {
  const date = parseBirthDate(display);
  return date ? toISODate(date) : null;
}

/** YYYY-MM-DD → GG.AA.YYYY */
export function isoToRideDateDisplay(iso: string | null | undefined): string {
  const normalized = normalizeRideDepartureDate(iso);
  return normalized ? isoToDisplayBirthDate(normalized) : '';
}

export function formatRideDateInput(value: string): string {
  return formatBirthDateInput(value);
}

export function formatRideDeparture(isoDate: string, time: string): string {
  const date = isoToRideDateDisplay(isoDate);
  const t = normalizeRideDepartureTime(time).slice(0, 5);
  return `${date} · ${t}`;
}

/** Bugünün başlangıcı (İstanbul takvim günü, yerel Date). */
export function rideMinimumDepartureDate(): Date {
  const iso = istanbulTodayIso();
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function isRideDepartureToday(value: Date): boolean {
  return departureAtToIsoDate(value) === istanbulTodayIso();
}

/** Varsayılan kalkış: bugün 09:00 (gelecekteyse) yoksa yarın 09:00. */
export function defaultRideDepartureAt(): Date {
  const todayNine = new Date(rideMinimumDepartureDate());
  todayNine.setHours(9, 0, 0, 0);
  if (todayNine.getTime() > Date.now()) return todayNine;

  const tomorrowNine = new Date(rideMinimumDepartureDate());
  tomorrowNine.setDate(tomorrowNine.getDate() + 1);
  tomorrowNine.setHours(9, 0, 0, 0);
  return tomorrowNine;
}

export function departureAtToIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function departureAtToTimeInput(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function parseRideDepartureAt(isoDate: string, time: string): Date {
  const date = normalizeRideDepartureDate(isoDate);
  const hhmm = normalizeRideDepartureTime(time).slice(0, 5);
  const [hours, minutes] = hhmm.split(':').map((part) => Number.parseInt(part, 10));
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function formatRideDepartureAt(value: Date): { dateLabel: string; timeLabel: string } {
  return {
    dateLabel: isoToRideDateDisplay(departureAtToIsoDate(value)),
    timeLabel: departureAtToTimeInput(value),
  };
}

export function mergeRideDatePart(base: Date, picked: Date): Date {
  const next = new Date(base);
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return next;
}

export function mergeRideTimePart(base: Date, pickedHours: number, pickedMinutes: number): Date {
  const next = new Date(base);
  next.setHours(pickedHours, pickedMinutes, 0, 0);
  return next;
}

const TR_WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });
const TR_DATE = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatRideDateOptionLabel(value: Date): string {
  const weekday = TR_WEEKDAY.format(value);
  const label = weekday.charAt(0).toLocaleUpperCase('tr-TR') + weekday.slice(1);
  return `${label}, ${TR_DATE.format(value)}`;
}

export function buildRideDateOptions(minDate: Date, days = 120): Date[] {
  const options: Date[] = [];
  const start = new Date(minDate);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    options.push(next);
  }
  return options;
}

export type RideTimeSlot = { hours: number; minutes: number; label: string };

export function buildRideTimeSlotOptions(notBefore?: Date): RideTimeSlot[] {
  const slots: RideTimeSlot[] = [];
  const minMs = notBefore?.getTime();

  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (minMs != null && notBefore) {
        const probe = new Date(notBefore);
        probe.setHours(h, m, 0, 0);
        if (probe.getTime() <= minMs) continue;
      }
      slots.push({
        hours: h,
        minutes: m,
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      });
    }
  }

  return slots;
}

/** Bugün seçiliyse ve kalkış geçmişte kaldıysa bir sonraki uygun 15 dk dilimine taşır. */
export function bumpRideDepartureToNextSlot(value: Date): Date {
  const iso = departureAtToIsoDate(value);
  const time = departureAtToTimeInput(value);
  if (isFutureRideDeparture(iso, time)) return value;

  if (!isRideDepartureToday(value)) return value;

  const slots = buildRideTimeSlotOptions(new Date());
  if (slots.length === 0) {
    const tomorrow = new Date(value);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  const first = slots[0];
  return mergeRideTimePart(value, first.hours, first.minutes);
}
