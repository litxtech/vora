import type { User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { mapAuthEmailError, normalizeEmailInput, validateEmail } from '@/features/auth/services/validation';
import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/types/database';

const GUEST_CREDS_KEY = 'auth.guest_credentials';
const GUEST_DEVICE_USED_KEY = 'auth.guest_device_used';
/** Supabase Auth rejects fake subdomains without DNS (e.g. guest.vora.app). */
const GUEST_EMAIL_DOMAIN = 'vora.app';

type GuestCredentials = { email: string; password: string };

function randomHex(bytes: number): string {
  let out = '';
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return out;
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateGuestPassword(): string {
  return `${randomHex(18)}Aa1!`;
}

function isEmailNotConfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('email not confirmed') || lower.includes('email_not_confirmed');
}

function mapGuestSignupError(message: string): string {
  if (isEmailNotConfirmedError(message)) {
    return 'Misafir hesabına giriş yapılamadı. Lütfen tekrar deneyin.';
  }

  const mapped = mapAuthEmailError(message);
  if (mapped !== message) return mapped;

  return message;
}

async function confirmGuestEmailIfNeeded(email: string): Promise<void> {
  if (!isGuestEmail(email)) return;
  await supabase.rpc('confirm_guest_auth_email', { p_email: email });
}

async function signInGuestWithRetry(creds: GuestCredentials): Promise<{ error: string | null }> {
  const attempt = async () => supabase.auth.signInWithPassword(creds);

  let { error } = await attempt();
  if (error && isEmailNotConfirmedError(error.message) && isGuestEmail(creds.email)) {
    await confirmGuestEmailIfNeeded(creds.email);
    ({ error } = await attempt());
  }

  if (!error) {
    await supabase.auth.refreshSession().catch(() => undefined);
  }

  return { error: error ? mapGuestSignupError(error.message) : null };
}

export function isGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower.startsWith('guest_') &&
    (lower.endsWith(`@${GUEST_EMAIL_DOMAIN}`) || lower.endsWith('@guest.vora.app'))
  );
}

/** Gerçek e-posta atanmışsa misafir sayılmaz; aksi halde profil/meta bayraklarına bakılır. */
export function resolveIsGuestUser(
  user: User | null,
  profile: { is_guest?: boolean | null } | null,
): boolean {
  if (user?.email && !isGuestEmail(user.email)) return false;
  if (profile?.is_guest) return true;
  return user?.user_metadata?.is_guest === true;
}

/** Misafir hesaplar zorunlu profil kurulumuna tabi değildir. */
export function shouldSkipOnboardingForGuest(
  user: User | null,
  profile: { is_guest?: boolean | null; onboarding_completed?: boolean | null } | null,
): boolean {
  return resolveIsGuestUser(user, profile);
}

export async function getStoredGuestCredentials(): Promise<GuestCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(GUEST_CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestCredentials;
  } catch {
    return null;
  }
}

/** Misafir hesap e-postası doğrulandıktan sonra cihazdaki giriş bilgisini günceller. */
export async function updateStoredGuestEmail(newEmail: string): Promise<void> {
  const creds = await getStoredGuestCredentials();
  if (!creds) return;

  const normalized = normalizeEmailInput(newEmail);
  if (!normalized || isGuestEmail(normalized)) return;

  await SecureStore.setItemAsync(
    GUEST_CREDS_KEY,
    JSON.stringify({ ...creds, email: normalized }),
  );
}

async function resolveVerifiedUserEmail(confirmedEmail?: string): Promise<string | null> {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;

  const serverEmail = normalizeEmailInput(userData.user.email ?? '');
  const fallbackEmail = normalizeEmailInput(confirmedEmail ?? '');

  if (serverEmail && !isGuestEmail(serverEmail)) return serverEmail;
  if (fallbackEmail && !isGuestEmail(fallbackEmail)) return fallbackEmail;
  return null;
}

export async function isGuestDeviceUsed(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(GUEST_DEVICE_USED_KEY)) === '1';
  } catch {
    return false;
  }
}

async function signInGuest(creds: GuestCredentials): Promise<{ error: string | null }> {
  return signInGuestWithRetry(creds);
}

async function createNewGuestAccount(): Promise<{ error: string | null }> {
  const id = generateId().replace(/-/g, '').slice(0, 12);
  const email = `guest_${id}@${GUEST_EMAIL_DOMAIN}`;
  const password = generateGuestPassword();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        is_guest: true,
        username: `guest_${id}`,
      },
    },
  });

  if (error) {
    return { error: mapGuestSignupError(error.message) };
  }

  if (!data.session) {
    const { error: signInError } = await signInGuestWithRetry({ email, password });
    if (signInError) return { error: signInError };
  }

  await SecureStore.setItemAsync(GUEST_CREDS_KEY, JSON.stringify({ email, password }));
  await SecureStore.setItemAsync(GUEST_DEVICE_USED_KEY, '1');
  return { error: null };
}

export type EnterGuestModeResult = {
  error: string | null;
  isNew: boolean;
};

/**
 * Cihaz başına yalnızca bir misafir hesap oluşturulur.
 * Kayıtlı kimlik bilgileri varsa mevcut hesaba giriş yapılır.
 */
export async function enterGuestMode(): Promise<EnterGuestModeResult> {
  const stored = await getStoredGuestCredentials();
  if (stored) {
    const { error } = await signInGuest(stored);
    if (!error) return { error: null, isNew: false };
    if (await isGuestDeviceUsed()) {
      return {
        error: 'Misafir hesabınıza giriş yapılamadı. Şahsi hesabınızla giriş yapın.',
        isNew: false,
      };
    }
  }

  if (await isGuestDeviceUsed()) {
    return {
      error: 'Bu cihazda misafir hesap zaten oluşturulmuş. Şahsi hesabınızla giriş yapın.',
      isNew: false,
    };
  }

  const { error } = await createNewGuestAccount();
  return { error, isNew: !error };
}

/** @deprecated enterGuestMode kullanın */
export async function createGuestAccount(): Promise<{ error: string | null }> {
  const result = await enterGuestMode();
  return { error: result.error };
}

export async function convertGuestEmail(email: string): Promise<{ error: string | null }> {
  const normalized = normalizeEmailInput(email);
  const validationError = validateEmail(normalized);
  if (validationError) {
    return { error: validationError };
  }

  if (isGuestEmail(normalized)) {
    return { error: 'Misafir e-posta adresi yerine gerçek bir adres girin.' };
  }

  const { error } = await supabase.auth.updateUser({ email: normalized });
  return { error: error ? mapAuthEmailError(error.message) : null };
}

/** Misafir hesabı gerçek e-posta ile bireysel hesaba dönüştürür. */
export async function completeGuestEmailConversion(
  policyConsents?: Json,
  options?: { confirmedEmail?: string },
): Promise<{ error: string | null }> {
  const { error: sessionError } = await supabase.auth.refreshSession();
  if (sessionError) return { error: sessionError.message };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { error: 'Oturum bulunamadı.' };

  const activeEmail = await resolveVerifiedUserEmail(options?.confirmedEmail);
  if (!activeEmail) {
    return { error: 'E-posta adresi güncellenemedi. Lütfen doğrulamayı tekrar deneyin.' };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { is_guest: false },
  });
  if (metaError) return { error: metaError.message };

  const profileUpdate: { is_guest: false; policy_consents?: Json } = { is_guest: false };
  if (policyConsents) profileUpdate.policy_consents = policyConsents;

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userData.user.id);

  if (profileError) return { error: profileError.message };

  await SecureStore.deleteItemAsync(GUEST_CREDS_KEY).catch(() => undefined);
  await supabase.auth.refreshSession().catch(() => undefined);
  return { error: null };
}

export async function finalizeGuestConversion(
  password: string,
  policyConsents: Json,
  options?: { confirmedEmail?: string },
): Promise<{ error: string | null }> {
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) return { error: passwordError.message };

  return completeGuestEmailConversion(policyConsents, options);
}
