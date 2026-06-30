import { updateStoredGuestEmail } from '@/features/auth/services/guestAccount';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type EmailOtpType = 'signup' | 'email_change' | 'recovery';

export async function sendSignupVerification(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  return { error: supabaseErrorMessage(error) };
}

export async function verifyEmailOtp(
  email: string,
  code: string,
  type: EmailOtpType,
): Promise<{ error: string | null }> {
  if (code.length < 6) {
    return { error: '6 haneli doğrulama kodunu girin.' };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code,
    type,
  });

  if (error) {
    return { error: supabaseErrorMessage(error)! };
  }

  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } else {
    await supabase.auth.refreshSession();
  }

  if (type === 'email_change') {
    await updateStoredGuestEmail(email);
  }

  return { error: null };
}
