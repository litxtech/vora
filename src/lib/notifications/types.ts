import type { NotificationEventType } from '@/constants/notifications';

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
  title: string;
  body: string;
  data: Record<string, unknown>;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type SendNotificationPayload = {
  recipientId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  actorId?: string;
  data?: Record<string, unknown>;
};
