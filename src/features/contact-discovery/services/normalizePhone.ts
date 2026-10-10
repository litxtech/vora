import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { E164_PATTERN } from '@/features/contact-discovery/constants';

export type PhoneNormalizeResult =
  | { ok: true; e164: string; country: CountryCode }
  | { ok: false; reason: 'empty' | 'invalid' };

export function defaultCountryFromLocale(locale?: string | null): CountryCode {
  const region = locale?.match(/[-_]([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  if (region && /^[A-Z]{2}$/.test(region)) return region as CountryCode;
  return 'TR';
}

function compactPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  let compact = trimmed.replace(/[().\-\s]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  return compact;
}

/** Ham numarayı E.164 biçimine çevirir. Geçersiz girişlerde ham değeri döndürmez. */
export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = 'TR',
): PhoneNormalizeResult {
  const compact = compactPhone(raw);
  if (!compact) return { ok: false, reason: 'empty' };

  try {
    const parsed = parsePhoneNumberFromString(compact, defaultCountry);
    if (!parsed?.isValid()) return { ok: false, reason: 'invalid' };
    const e164 = parsed.number;
    if (!E164_PATTERN.test(e164)) return { ok: false, reason: 'invalid' };
    return { ok: true, e164, country: parsed.country ?? defaultCountry };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export type ContactBookUpload = {
  raw: string;
  e164: string | null;
  country: string | null;
};

export type NamedContactUpload = ContactBookUpload & {
  name: string | null;
};

/** Telefonda görünen biçimi korur; eşleştirme için ayrıca E.164 üretir. */
export function prepareContactEntries(
  raws: readonly string[],
  defaultCountry: CountryCode = 'TR',
): ContactBookUpload[] {
  const entries: ContactBookUpload[] = [];
  const seen = new Set<string>();

  for (const raw of raws) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    const stored = trimmed.slice(0, 40);
    const normalized = normalizePhone(stored, defaultCountry);
    entries.push({
      raw: stored,
      e164: normalized.ok ? normalized.e164 : null,
      country: normalized.ok ? normalized.country : null,
    });
  }

  return entries;
}

/** Kişi adı rehberde kalsın; her numara ayrı satır olarak sunucuya gider. */
export function prepareNamedContactEntries(
  contacts: readonly { name: string; phones: readonly string[] }[],
  defaultCountry: CountryCode = 'TR',
): NamedContactUpload[] {
  const entries: NamedContactUpload[] = [];
  const seen = new Set<string>();

  for (const contact of contacts) {
    const name = contact.name.trim().slice(0, 120) || null;
    for (const phone of contact.phones) {
      const trimmed = phone.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      const stored = trimmed.slice(0, 40);
      const normalized = normalizePhone(stored, defaultCountry);
      entries.push({
        raw: stored,
        e164: normalized.ok ? normalized.e164 : null,
        country: normalized.ok ? normalized.country : null,
        name,
      });
    }
  }

  return entries;
}

export function prepareMatchPhones(
  raws: readonly string[],
  defaultCountry: CountryCode = 'TR',
): { phones: string[]; invalidCount: number } {
  const phones: string[] = [];
  const seen = new Set<string>();
  let invalidCount = 0;

  for (const raw of raws) {
    const normalized = normalizePhone(raw, defaultCountry);
    if (!normalized.ok) {
      if (normalized.reason === 'invalid') invalidCount += 1;
      continue;
    }
    if (seen.has(normalized.e164)) continue;
    seen.add(normalized.e164);
    phones.push(normalized.e164);
  }

  return { phones, invalidCount };
}
