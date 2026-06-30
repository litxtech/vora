import { supabase } from '@/lib/supabase/client';
import type { DailyTaskRow } from '@/features/admin/services/phase2Management';
import { supabaseErrorMessage } from '@/lib/errors';

export type CreateDailyTaskInput = {
  key: string;
  title: string;
  description: string;
  target_count: number;
  reward_type: 'points' | 'badge' | 'boost';
  reward_value: number;
  reward_key?: string | null;
  sort_order?: number;
};

export async function createDailyTask(input: CreateDailyTaskInput): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_create_daily_task', {
    p_key: input.key,
    p_title: input.title,
    p_description: input.description,
    p_target_count: input.target_count,
    p_reward_type: input.reward_type,
    p_reward_value: input.reward_value,
    p_reward_key: input.reward_key ?? null,
    p_sort_order: input.sort_order ?? 99,
  });
  return { error: supabaseErrorMessage(error) };
}

export type { DailyTaskRow };
