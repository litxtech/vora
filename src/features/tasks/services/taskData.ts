import { DEMO_DAILY_TASKS } from '@/features/tasks/demo';
import { demoArrayFallback } from '@/lib/demo/demoData';
import type { DailyTask, TaskRewardResult } from '@/features/tasks/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type TaskRow = {
  task_key: string;
  title: string;
  description: string;
  target_count: number;
  progress: number;
  reward_type: string;
  reward_value: number;
  completed_at: string | null;
  claimed_at: string | null;
  sort_order: number;
};

function mapTask(row: TaskRow): DailyTask {
  const rewardType = row.reward_type === 'kuru' ? 'points' : (row.reward_type as DailyTask['rewardType']);
  return {
    taskKey: row.task_key,
    title: row.title,
    description: row.description,
    targetCount: row.target_count,
    progress: row.progress,
    rewardType,
    rewardValue: row.reward_value,
    completedAt: row.completed_at,
    claimedAt: row.claimed_at,
    sortOrder: row.sort_order,
  };
}

export async function fetchDailyTasks(userId: string): Promise<DailyTask[]> {
  const { data, error } = await supabase.rpc('get_user_daily_tasks', {
    p_user_id: userId,
  });

  if (error || !data?.length) {
    return demoArrayFallback(DEMO_DAILY_TASKS);
  }

  return (data as TaskRow[]).map(mapTask);
}

export async function claimTaskReward(
  userId: string,
  taskKey: string,
): Promise<{ ok: boolean; result: TaskRewardResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('claim_daily_task_reward', {
    p_user_id: userId,
    p_task_key: taskKey,
  });

  if (error) {
    return { ok: false, result: null, error: supabaseErrorMessage(error)! };
  }

  const result = data as { task_key: string; reward_type: string; reward_value: number };
  return {
    ok: true,
    result: {
      taskKey: result.task_key,
      rewardType: result.reward_type as TaskRewardResult['rewardType'],
      rewardValue: result.reward_value,
    },
    error: null,
  };
}
