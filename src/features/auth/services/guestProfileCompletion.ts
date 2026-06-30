import {
  normalizeUsernameInput,
  validateTurkishName,
  validateUsername,
} from '@/features/auth/services/validation';
import { isUsernameAvailable, mapUsernameDatabaseError } from '@/features/auth/services/username';
import { updateProfile } from '@/features/profile/services/profileData';
import { USERNAME_MIN_LENGTH } from '@/constants/auth';
import type { Database } from '@/types/database';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'username' | 'full_name' | 'first_name' | 'last_name' | 'is_guest'
>;

const GUEST_USERNAME_PREFIX = 'guest_';

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  İ: 'i',
  I: 'i',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

function transliterateTurkish(value: string): string {
  return value
    .split('')
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join('');
}

export function isAutoGuestUsername(username: string | null | undefined): boolean {
  if (!username) return true;
  return username.toLowerCase().startsWith(GUEST_USERNAME_PREFIX);
}

export function hasGuestDisplayName(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  const fullName = profile.full_name?.trim();
  if (fullName && fullName.length >= 2) return true;
  const firstName = profile.first_name?.trim();
  return !!firstName && firstName.length >= 2;
}

/** Misafir hesabı etkileşim için isim + gerçek kullanıcı adı seçmiş mi? */
export function isGuestProfileComplete(profile: Profile | null | undefined, isGuest: boolean): boolean {
  if (!isGuest) return true;
  if (!profile) return false;
  return hasGuestDisplayName(profile) && !isAutoGuestUsername(profile.username);
}

export function suggestUsernameFromDisplayName(displayName: string): string {
  const transliterated = transliterateTurkish(displayName.trim().toLowerCase());
  const parts = transliterated
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9_.-]/g, ''))
    .filter(Boolean);

  let base = parts.join('_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!base) base = 'kullanici';
  if (base.length < USERNAME_MIN_LENGTH) {
    base = `${base}_${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  return base.slice(0, 30);
}

export function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const trimmed = displayName.trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = trimmed.split(' ');
  return {
    firstName: firstName ?? '',
    lastName: rest.join(' '),
  };
}

async function resolveAvailableUsername(
  preferred: string,
  userId: string,
): Promise<string | null> {
  const normalized = normalizeUsernameInput(preferred);
  const validationError = validateUsername(normalized);
  if (!validationError && (await isUsernameAvailable(normalized, userId))) {
    return normalized;
  }

  const base = normalized.replace(/_\d+$/, '').slice(0, 24) || 'kullanici';
  for (let i = 0; i < 8; i += 1) {
    const suffix = i === 0 ? '' : `_${1000 + i}`;
    const candidate = `${base}${suffix}`.slice(0, 30);
    const candidateError = validateUsername(candidate);
    if (candidateError) continue;
    if (await isUsernameAvailable(candidate, userId)) return candidate;
  }

  return null;
}

export type CompleteGuestProfileInput = {
  userId: string;
  displayName: string;
  username: string;
};

export async function completeGuestProfile(
  input: CompleteGuestProfileInput,
): Promise<{ error: string | null }> {
  const displayNameError = validateTurkishName(input.displayName, 'Ad soyad');
  if (displayNameError) return { error: displayNameError };

  const usernameError = validateUsername(input.username);
  if (usernameError) return { error: usernameError };

  const normalizedUsername = normalizeUsernameInput(input.username);
  if (!(await isUsernameAvailable(normalizedUsername, input.userId))) {
    return { error: 'Bu kullanıcı adı zaten kullanılıyor.' };
  }

  const { firstName, lastName } = splitDisplayName(input.displayName);
  const firstNameError = validateTurkishName(firstName, 'Ad');
  if (firstNameError) return { error: firstNameError };
  if (lastName) {
    const lastNameError = validateTurkishName(lastName, 'Soyad');
    if (lastNameError) return { error: lastNameError };
  }

  const { error } = await updateProfile(input.userId, {
    firstName,
    lastName,
    username: normalizedUsername,
  });

  if (error) {
    return { error: mapUsernameDatabaseError(error) ?? error };
  }

  return { error: null };
}

export async function suggestAvailableUsername(
  displayName: string,
  userId: string,
): Promise<string> {
  const preferred = suggestUsernameFromDisplayName(displayName);
  const resolved = await resolveAvailableUsername(preferred, userId);
  return resolved ?? `${preferred}_${Date.now().toString().slice(-4)}`.slice(0, 30);
}
