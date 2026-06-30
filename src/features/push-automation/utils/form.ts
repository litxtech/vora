import { PUSH_DEEP_LINK_NONE, QUICK_PUSH_DEFAULTS } from '@/features/push-automation/constants';
import type {
  PushAutomationTemplate,
  PushAutomationTemplateInput,
} from '@/features/push-automation/types';

export function formFromTemplate(t: PushAutomationTemplate): PushAutomationTemplateInput {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    enabled: t.enabled,
    triggerType: t.triggerType,
    eventType: t.eventType,
    title: t.title,
    body: t.body,
    imageUrl: t.imageUrl,
    deepLink: t.deepLink ?? PUSH_DEEP_LINK_NONE,
    regionIds: t.regionIds,
    minPostsInWindow: t.minPostsInWindow,
    activityWindowMinutes: t.activityWindowMinutes,
    userCooldownHours: t.userCooldownHours,
    regionCooldownMinutes: t.regionCooldownMinutes,
    intervalHours: t.intervalHours,
    intervalDays: t.intervalDays,
    nextRunAt: t.nextRunAt,
    sortOrder: t.sortOrder,
    prefKey: t.prefKey,
  };
}

export function emptyPushForm(): PushAutomationTemplateInput {
  return {
    name: '',
    slug: '',
    title: '',
    body: '',
    ...QUICK_PUSH_DEFAULTS,
  };
}
