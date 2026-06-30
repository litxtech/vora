export type PushAutomationTriggerType = 'feed_activity' | 'interval' | 'manual' | 'scheduled';

export type PushAutomationTemplate = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  triggerType: PushAutomationTriggerType;
  eventType: string;
  title: string;
  body: string;
  imageUrl: string | null;
  deepLink: string | null;
  regionIds: string[] | null;
  minPostsInWindow: number;
  activityWindowMinutes: number;
  userCooldownHours: number;
  regionCooldownMinutes: number;
  intervalHours: number | null;
  intervalDays: number | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunRecipients: number;
  sortOrder: number;
  prefKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PushAutomationRun = {
  id: string;
  templateId: string | null;
  status: 'completed' | 'failed' | 'skipped';
  recipientsCount: number;
  regionId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type PushAutomationTemplateInput = {
  id?: string;
  name: string;
  slug: string;
  enabled: boolean;
  triggerType: PushAutomationTriggerType;
  eventType: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink: string | null;
  regionIds?: string[] | null;
  minPostsInWindow: number;
  activityWindowMinutes: number;
  userCooldownHours: number;
  regionCooldownMinutes: number;
  intervalHours?: number | null;
  intervalDays?: number | null;
  nextRunAt?: string | null;
  sortOrder: number;
  prefKey: string;
};
