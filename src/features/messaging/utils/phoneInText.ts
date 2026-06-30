export type TextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'phone'; value: string; display: string };

/** Mesaj metninde telefon numarası adaylarını yakalar (TR + uluslararası). */
const PHONE_CANDIDATE_REGEX = /\+?\(?\d[\d\s().-]{7,18}\d/g;

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isPhoneCandidate(match: string): boolean {
  const digits = digitsOnly(match);
  if (digits.length < 10 || digits.length > 15) return false;

  const compact = match.replace(/[\s().-]/g, '');
  if (/^\+/.test(compact)) return true;
  if (/^0\d/.test(compact)) return true;
  if (/^90[1-9]/.test(digits)) return true;
  if (digits.length === 10 && digits.startsWith('5')) return true;

  return /[\s().-]/.test(match) && digits.length >= 10;
}

export function splitTextByPhoneNumbers(text: string): TextSegment[] {
  if (!text) return [{ kind: 'text', value: '' }];

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PHONE_CANDIDATE_REGEX)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (!isPhoneCandidate(raw)) continue;

    if (index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, index) });
    }

    segments.push({ kind: 'phone', value: raw.trim(), display: raw.trim() });
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return [{ kind: 'text', value: text }];
  }

  return segments;
}

export function textContainsPhoneNumber(text: string): boolean {
  return splitTextByPhoneNumbers(text).some((segment) => segment.kind === 'phone');
}

export function toTelUri(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.startsWith('90') && digits.length >= 12) return `tel:+${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) return `tel:+90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('5')) return `tel:+90${digits}`;
  if (raw.trim().startsWith('+')) return `tel:${raw.replace(/\s/g, '')}`;
  return `tel:${digitsOnly(raw)}`;
}

export function toWhatsAppPhone(raw: string): string {
  let digits = digitsOnly(raw);
  if (digits.startsWith('0')) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith('5')) digits = `90${digits}`;
  else if (!digits.startsWith('90') && digits.length >= 10) {
    // Uluslararası numaralar olduğu gibi bırakılır
  }
  return digits;
}
