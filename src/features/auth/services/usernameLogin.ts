import { supabase } from '@/lib/supabase/client';
import {
  isEmailLoginIdentifier,
  normalizeUsernameInput,
  validateEmail,
  validateUsername,
} from '@/features/auth/services/validation';

const INVALID_CREDENTIALS = 'E-posta/kullanıcı adı veya şifre hatalı.';

export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<{ error: string | null }> {
  const trimmed = identifier.trim();

  if (!trimmed) {
    return { error: 'E-posta veya kullanıcı adı gereklidir.' };
  }

  if (!password) {
    return { error: 'Şifre gereklidir.' };
  }

  if (isEmailLoginIdentifier(trimmed)) {
    const emailError = validateEmail(trimmed);
    if (emailError) {
      return { error: emailError };
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmed.toLowerCase(),
      password,
    });

    if (authError) {
      return { error: INVALID_CREDENTIALS };
    }

    return { error: null };
  }

  const normalized = normalizeUsernameInput(trimmed);
  const usernameError = validateUsername(normalized);
  if (usernameError) {
    return { error: usernameError };
  }

  const { data: email, error: rpcError } = await supabase.rpc('resolve_login_email', {
    p_username: normalized,
  });

  if (rpcError) {
    if (__DEV__) {
      console.warn('[auth] resolve_login_email failed:', rpcError.message);
    }
    return { error: INVALID_CREDENTIALS };
  }

  if (!email) {
    return { error: INVALID_CREDENTIALS };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: INVALID_CREDENTIALS };
  }

  return { error: null };
}

/** @deprecated use signInWithIdentifier */
export const signInWithUsername = signInWithIdentifier;
