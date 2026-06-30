import type { MisinfoFlagType } from '@/features/moderation/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function flagMisinformation(
  flaggerId: string,
  targetType: string,
  targetId: string,
  flagType: MisinfoFlagType,
  details?: string,
): Promise<{ error: string | null }> {
  if (targetId.startsWith('demo-')) return { error: null };

  const { error } = await supabase.from('content_misinfo_flags').insert({
    flagger_id: flaggerId,
    target_type: targetType,
    target_id: targetId,
    flag_type: flagType,
    details: details ?? null,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function fetchMisinfoFlagCounts(
  targetType: string,
  targetId: string,
): Promise<Record<MisinfoFlagType, number>> {
  const { data } = await supabase
    .from('content_misinfo_flags')
    .select('flag_type')
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  const counts: Record<MisinfoFlagType, number> = {
    wrong_info: 0,
    incomplete_info: 0,
    outdated: 0,
    wrong_location: 0,
  };

  for (const row of data ?? []) {
    const key = row.flag_type as MisinfoFlagType;
    if (key in counts) counts[key]++;
  }

  return counts;
}
