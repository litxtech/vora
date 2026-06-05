import {
  BANNED_WORDS,
  MIN_AGE,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/constants/auth';

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

export function validateUsername(username: string): string | null {
  const normalized = username.trim().toLowerCase();

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `Kullanıcı adı en az ${USERNAME_MIN_LENGTH} karakter olmalıdır.`;
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `Kullanıcı adı en fazla ${USERNAME_MAX_LENGTH} karakter olabilir.`;
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return 'Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.';
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

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'E-posta adresi gereklidir.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Geçerli bir e-posta adresi girin.';
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

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
