const ISTANBUL_TZ = 'Europe/Istanbul';
const ISTANBUL_OFFSET = '+03:00';

export type IstanbulScheduleParts = {
  dateIso: string;
  hour: number;
  minute: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatIstanbulSchedule(parts: IstanbulScheduleParts): string {
  const iso = istanbulPartsToIso(parts);
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: ISTANBUL_TZ,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function istanbulPartsToIso(parts: IstanbulScheduleParts): string {
  return new Date(
    `${parts.dateIso}T${pad2(parts.hour)}:${pad2(parts.minute)}:00${ISTANBUL_OFFSET}`,
  ).toISOString();
}

export function isoToIstanbulParts(iso: string): IstanbulScheduleParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const values = formatter.formatToParts(new Date(iso));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(values.find((part) => part.type === type)?.value ?? '0');

  const day = read('day');
  const month = read('month');
  const year = read('year');

  return {
    dateIso: `${year}-${pad2(month)}-${pad2(day)}`,
    hour: read('hour'),
    minute: read('minute'),
  };
}

export function defaultIstanbulSchedule(hoursAhead = 1): IstanbulScheduleParts {
  const target = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return isoToIstanbulParts(target.toISOString());
}

export function istanbulPartsToPickerDate(parts: IstanbulScheduleParts): Date {
  return new Date(
    `${parts.dateIso}T${pad2(parts.hour)}:${pad2(parts.minute)}:00${ISTANBUL_OFFSET}`,
  );
}

export function pickerDateToIstanbulParts(date: Date): IstanbulScheduleParts {
  return isoToIstanbulParts(date.toISOString());
}

export function isFutureIstanbulSchedule(parts: IstanbulScheduleParts): boolean {
  return Date.parse(istanbulPartsToIso(parts)) > Date.now();
}

const TR_WEEKDAY = new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL_TZ, weekday: 'long' });
const TR_DATE = new Intl.DateTimeFormat('tr-TR', {
  timeZone: ISTANBUL_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatIstanbulDateOptionLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00${ISTANBUL_OFFSET}`);
  const weekday = TR_WEEKDAY.format(date);
  const label = weekday.charAt(0).toLocaleUpperCase('tr-TR') + weekday.slice(1);
  return `${label}, ${TR_DATE.format(date)}`;
}

export type IstanbulDateOption = { dateIso: string; label: string };

export function buildIstanbulDateOptions(days = 120): IstanbulDateOption[] {
  const startParts = isoToIstanbulParts(new Date().toISOString());
  const options: IstanbulDateOption[] = [];

  for (let i = 0; i < days; i++) {
    const anchor = new Date(`${startParts.dateIso}T12:00:00${ISTANBUL_OFFSET}`);
    anchor.setUTCDate(anchor.getUTCDate() + i);
    const parts = isoToIstanbulParts(anchor.toISOString());
    options.push({
      dateIso: parts.dateIso,
      label: formatIstanbulDateOptionLabel(parts.dateIso),
    });
  }

  return options;
}

export type IstanbulTimeSlot = { hour: number; minute: number; label: string };

export function isIstanbulScheduleToday(parts: IstanbulScheduleParts): boolean {
  const today = isoToIstanbulParts(new Date().toISOString());
  return parts.dateIso === today.dateIso;
}

export function buildIstanbulTimeSlotOptions(
  dateIso: string,
  intervalMinutes = 1,
): IstanbulTimeSlot[] {
  const slots: IstanbulTimeSlot[] = [];
  const today = isoToIstanbulParts(new Date().toISOString());
  const isToday = dateIso === today.dateIso;
  const minMs = isToday ? Date.now() : undefined;

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (minMs != null) {
        const probeIso = istanbulPartsToIso({ dateIso, hour, minute });
        if (Date.parse(probeIso) <= minMs) continue;
      }
      slots.push({
        hour,
        minute,
        label: `${pad2(hour)}:${pad2(minute)}`,
      });
    }
  }

  return slots;
}

export function mergeIstanbulDatePart(
  parts: IstanbulScheduleParts,
  dateIso: string,
): IstanbulScheduleParts {
  return { ...parts, dateIso };
}

export function mergeIstanbulTimePart(
  parts: IstanbulScheduleParts,
  hour: number,
  minute: number,
): IstanbulScheduleParts {
  return { ...parts, hour, minute };
}

export const ISTANBUL_SCHEDULE_LABEL = 'Türkiye saati (GMT+3)';
