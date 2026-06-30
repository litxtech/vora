import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function activateProfileBoost(message: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('activate_profile_boost', {
    p_message: message.trim(),
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  return { error: null };
}

/** @deprecated use activateProfileBoost */
export async function boostProfile(_userId: string, message?: string): Promise<{ error: string | null }> {
  if (!message?.trim()) return { error: 'Kampanya metni gerekli.' };
  return activateProfileBoost(message);
}

export async function updateProfileBoostMessage(message: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_profile_boost_message', {
    p_message: message.trim(),
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  return { error: null };
}

export async function cancelProfileBoost(_userId?: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('cancel_profile_boost');
  if (error) return { error: supabaseErrorMessage(error)! };
  return { error: null };
}

export function isProfileBoosted(boostedUntil: string | null | undefined): boolean {
  if (!boostedUntil) return false;
  return new Date(boostedUntil) > new Date();
}

export function formatBoostRemaining(boostedUntil: string | null | undefined): string | null {
  if (!isProfileBoosted(boostedUntil)) return null;

  const ms = new Date(boostedUntil!).getTime() - Date.now();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return hours > 0 ? `${days} gün ${hours} saat kaldı` : `${days} gün kaldı`;
  }
  if (hours > 0) return `${hours} saat kaldı`;

  const minutes = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `${minutes} dk kaldı`;
}
