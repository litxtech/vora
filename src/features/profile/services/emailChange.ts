import { verifyEmailOtp } from '@/features/auth/services/emailVerification';
import { mapAuthEmailError, normalizeEmailInput, validateEmail } from '@/features/auth/services/validation';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type EmailChangeStep = 'idle' | 'verify-current' | 'new-email' | 'verify-new';

/** Mevcut e-postaya 6 haneli doğrulama kodu gönderir. */
export async function sendCurrentEmailVerificationCode(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.reauthenticate();
  return { error: supabaseErrorMessage(error) };
}

/** Mevcut e-postadaki 6 haneli kodu doğrular. */
export async function verifyCurrentEmailCode(
  currentEmail: string,
  code: string,
): Promise<{ error: string | null }> {
  if (code.length < 6) {
    return { error: '6 haneli doğrulama kodunu girin.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: currentEmail.trim(),
    token: code,
    type: 'email',
  });

  return { error: supabaseErrorMessage(error) };
}

/** Yeni e-posta adresini kaydeder; yeni adrese doğrulama kodu gönderilir. */
export async function requestEmailChange(newEmail: string): Promise<{ error: string | null }> {
  const normalized = normalizeEmailInput(newEmail);
  const validationError = validateEmail(normalized);
  if (validationError) {
    return { error: validationError };
  }

  const { error } = await supabase.auth.updateUser({ email: normalized });
  return { error: error ? mapAuthEmailError(error.message) : null };
}

/** Yeni e-postadaki doğrulama kodunu onaylar. */
export async function verifyNewEmailCode(
  newEmail: string,
  code: string,
): Promise<{ error: string | null }> {
  return verifyEmailOtp(newEmail, code, 'email_change');
}
