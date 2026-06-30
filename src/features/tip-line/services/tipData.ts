import { supabase } from '@/lib/supabase/client';
import type { TipCategory } from '@/features/tip-line/constants';
import { supabaseErrorMessage } from '@/lib/errors';

export async function submitAnonymousTip(
  regionId: string,
  category: TipCategory,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('anonymous_tips').insert({
    region_id: regionId,
    category,
    description,
    moderation_status: 'pending',
  });

  if (error) return { ok: false, error: supabaseErrorMessage(error)! };
  return { ok: true };
}
