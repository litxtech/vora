export type TaskRewardType = 'points' | 'kuru' | 'badge' | 'premium_days' | 'achievement';

export type DailyTask = {
  taskKey: string;
  title: string;
  description: string;
  targetCount: number;
  progress: number;
  rewardType: TaskRewardType;
  rewardValue: number;
  completedAt: string | null;
  claimedAt: string | null;
  sortOrder: number;
};

export type TaskRewardResult = {
  taskKey: string;
  rewardType: TaskRewardType;
  rewardValue: number;
};
