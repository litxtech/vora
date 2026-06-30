import type {
  NotificationCategoryId,
  NotificationEventType,
  NotificationPriorityId,
} from '@/constants/notifications';

export type PushTokenRecord = {
  platform: 'ios' | 'android' | 'web';
  expoPushToken: string | null;
  devicePushToken: string | null;
  deviceId: string;
};

export type NotificationSoundSetting = {
  eventType: NotificationEventType;
  label: string;
  soundStoragePath: string | null;
  soundFilename: string | null;
  soundUrl: string | null;
  durationSeconds: number | null;
  isCustomEnabled: boolean;
};

export type AppNotification = {
  id: string;
  eventType: NotificationEventType;
  category: NotificationCategoryId;
  priority: NotificationPriorityId;
  title: string;
  body: string;
  data: Record<string, unknown>;
  actorId: string | null;
  readAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
};

export type SendNotificationPayload = {
  recipientId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  actorId?: string;
  data?: Record<string, unknown>;
  pushOnly?: boolean;
};

export type QuietHoursSettings = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};

export type RegionalAlertSubscription = {
  regionId: string;
  districts: string[];
  neighborhoods: string[];
  notifyEmergency: boolean;
  notifyIncidents: boolean;
  notifyEvents: boolean;
  notifyJobs: boolean;
};

export type EmergencyAlertPayload = {
  title: string;
  body: string;
  eventType: NotificationEventType;
  data: Record<string, unknown>;
};
