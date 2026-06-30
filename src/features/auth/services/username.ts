import { USERNAME_MIN_LENGTH } from '@/constants/auth';
import { normalizeUsernameInput } from '@/features/auth/services/validation';
import { toUserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const normalized = normalizeUsernameInput(username);
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .maybeSingle();

  if (error) return false;
  if (!data) return true;
  if (excludeUserId && data.id === excludeUserId) return true;
  return false;
}

export function mapUsernameDatabaseError(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('username_too_short')) {
    return `Kullanıcı adı en az ${USERNAME_MIN_LENGTH} karakter olmalıdır.`;
  }
  if (lower.includes('username_too_long')) {
    return 'Kullanıcı adı en fazla 30 karakter olabilir.';
  }
  if (lower.includes('username_invalid_format')) {
    return 'Kullanıcı adı yalnızca harf, rakam, alt çizgi, nokta ve tire içerebilir.';
  }
  if (lower.includes('duplicate key') || lower.includes('profiles_username_key')) {
    return 'Bu kullanıcı adı zaten kullanılıyor.';
  }
  return toUserFacingError(message, { fallback: 'Kullanıcı adı kaydedilemedi. Lütfen tekrar deneyin.' });
}
