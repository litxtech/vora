import {
  BANNED_WORDS,
  MIN_AGE,
  PASSWORD_MIN_LENGTH,
  USERNAME_FORMAT_REGEX,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/constants/auth';
import { toUserFacingError } from '@/lib/errors';

export function isAdult(birthDate: Date): boolean {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= MIN_AGE;
}

export function parseBirthDate(value: string): Date | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function normalizeUsernameInput(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

export function isEmailLoginIdentifier(value: string): boolean {
  return value.trim().includes('@');
}

export function normalizeLoginIdentifierInput(value: string): string {
  if (isEmailLoginIdentifier(value)) {
    return value.trimStart().toLowerCase();
  }
  return normalizeUsernameInput(value);
}

export function normalizeLoginIdentifierForStorage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (isEmailLoginIdentifier(trimmed)) return trimmed.toLowerCase();
  return normalizeUsernameInput(trimmed);
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsernameInput(username);

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `Kullanıcı adı en az ${USERNAME_MIN_LENGTH} karakter olmalıdır.`;
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `Kullanıcı adı en fazla ${USERNAME_MAX_LENGTH} karakter olabilir.`;
  }
  if (!USERNAME_FORMAT_REGEX.test(normalized)) {
    return 'Kullanıcı adı yalnızca harf, rakam, alt çizgi, nokta ve tire içerebilir.';
  }
  if (BANNED_WORDS.some((word) => normalized.includes(word))) {
    return 'Bu kullanıcı adı kullanılamaz.';
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır.`;
  }
  return null;
}

const EMAIL_LOCAL_PART_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~'-]+$/;
const EMAIL_DOMAIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** Kopyala-yapıştır, mailto: ve görünmez karakterleri temizler; domain ASCII küçük harfe çevrilir. */
export function normalizeEmailInput(email: string): string {
  let value = email
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^mailto:/i, '');

  const angleMatch = value.match(/<([^<>]+@[^<>]+)>/);
  if (angleMatch) {
    value = angleMatch[1].trim();
  } else if (value.includes('@') && /\s/.test(value)) {
    const token = value.split(/\s+/).find((part) => part.includes('@'));
    if (token) value = token;
  }

  value = value
    .replace(/^["']|["']$/g, '')
    .replace(/^<|>$/g, '')
    .replace(/[;,]+$/, '')
    .replace(/\s+/g, '');

  const at = value.lastIndexOf('@');
  if (at > 0) {
    const local = value.slice(0, at);
    const domain = value.slice(at + 1).toLowerCase().replace(/\.+$/, '');
    value = `${local}@${domain}`;
  } else {
    value = value.toLowerCase();
  }

  return value;
}

export function isReservedAuthEmailDomain(email: string): boolean {
  const lower = normalizeEmailInput(email);
  return lower.endsWith('@vora.app') || lower.endsWith('@guest.vora.app');
}

export function validateEmail(email: string): string | null {
  const normalized = normalizeEmailInput(email);
  if (!normalized) return 'E-posta adresi gereklidir.';

  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  if (local.length > 64 || domain.length > 253) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  if (!EMAIL_LOCAL_PART_RE.test(local) || !EMAIL_DOMAIN_RE.test(domain)) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  if (isReservedAuthEmailDomain(normalized)) {
    return 'Bu e-posta adresi kullanılamaz.';
  }

  return null;
}

export function mapAuthEmailError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'E-posta henüz doğrulanmadı. Gelen kutunuzdaki kodu girin.';
  }

  if (
    lower.includes('invalid') ||
    lower.includes('email_address_invalid') ||
    lower.includes('unable to validate email') ||
    lower.includes('invalid format')
  ) {
    return 'E-posta adresi geçersiz görünüyor. Adresi kontrol edin (ör. ad@firma.com.tr, isim veya < > olmadan).';
  }

  if (
    lower.includes('already') ||
    lower.includes('registered') ||
    lower.includes('exists') ||
    lower.includes('duplicate')
  ) {
    return 'Bu e-posta adresi zaten kullanılıyor.';
  }

  if (lower.includes('rate limit')) {
    return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
  }

  return toUserFacingError(message, { fallback: 'E-posta işlemi tamamlanamadı. Lütfen tekrar deneyin.' });
}

const TURKISH_NAME_RE = /^[a-zA-ZçğıöşüÇĞİÖŞÜ\s'-]+$/;

export function validateTurkishName(value: string, label = 'Bu alan'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} gereklidir.`;
  if (trimmed.length < 2) return `${label} en az 2 karakter olmalıdır.`;
  if (!TURKISH_NAME_RE.test(trimmed)) {
    return `${label} yalnızca harf içerebilir.`;
  }
  return null;
}

export function validateBirthDate(value: string): string | null {
  const date = parseBirthDate(value);
  if (!date) return 'Doğum tarihini GG.AA.YYYY formatında girin.';
  if (date > new Date()) return 'Gelecek bir tarih girilemez.';
  if (!isAdult(date)) {
    return 'Bu platform yalnızca 18 yaş ve üzeri kullanıcılar içindir.';
  }
  return null;
}

/** Boş bırakılabilir; doluysa validateBirthDate kuralları uygulanır. */
export function validateOptionalBirthDate(value: string): string | null {
  if (!value.trim()) return null;
  return validateBirthDate(value);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoToDisplayBirthDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}.${m}.${y}`;
}

export function normalizeIban(value: string): string {
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (/^\d{2,}$/.test(raw)) return `TR${raw}`.slice(0, 26);
  return raw.slice(0, 26);
}

export function formatIbanInput(value: string): string {
  const cleaned = normalizeIban(value).slice(0, 26);
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

export function validateTurkishIban(value: string): string | null {
  const normalized = normalizeIban(value);
  if (!normalized) return null;
  if (!/^TR\d{24}$/.test(normalized)) {
    return 'Geçerli bir TR IBAN girin (TR + 24 rakam).';
  }
  return null;
}
