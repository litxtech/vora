import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function sendLoginOtp(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  return { error: supabaseErrorMessage(error) };
}

export async function verifyLoginOtp(
  email: string,
  code: string,
): Promise<{ error: string | null }> {
  if (code.length < 6) {
    return { error: '6 haneli doğrulama kodunu girin.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code,
    type: 'email',
  });

  return { error: supabaseErrorMessage(error) };
}
