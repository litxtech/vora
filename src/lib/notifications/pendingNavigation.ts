import { InteractionManager } from 'react-native';
import type { NotificationEventType } from '@/constants/notifications';
import {
  getNotificationBootFlushMs,
  getNotificationNavFlushMs,
  isAndroid,
} from '@/lib/device/androidPerfProfile';
import {
  extractActorId,
  extractNotificationEventType,
  extractNotificationId,
  normalizeNotificationData,
} from '@/lib/notifications/notificationPayload';

type PendingNavigation = {
  eventType: NotificationEventType;
  data: Record<string, unknown>;
  actorId: string | null;
  notificationId?: string;
  retryCount?: number;
};

let bootComplete = false;
let pending: PendingNavigation | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function markNotificationBootComplete(): void {
  bootComplete = true;
  scheduleFlush(getNotificationBootFlushMs(400));
}

export function resetNotificationBootState(): void {
  bootComplete = false;
  pending = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export function queueNotificationNavigation(rawData: Record<string, unknown>): void {
  const data = normalizeNotificationData(rawData);
  const eventType = extractNotificationEventType(data);
  if (!eventType) return;

  pending = {
    eventType,
    data,
    actorId: extractActorId(data),
    notificationId: extractNotificationId(data),
  };

  if (bootComplete) {
    scheduleFlush(getNotificationNavFlushMs(120));
  }
}

function scheduleFlush(delayMs: number): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPendingNotificationNavigation();
  }, delayMs);
}

export async function flushPendingNotificationNavigation(): Promise<void> {
  if (!bootComplete || !pending) return;

  const next = pending;
  pending = null;

  await new Promise<void>((resolve) => {
    if (isAndroid()) {
      resolve();
      return;
    }

    // InteractionManager yoğun/animasyonlu bir feed'de süresiz takılabilir;
    // bu da bildirim hedefine geç gitme veya anasayfada kalma yaratır.
    // İlk hangisi gelirse onunla devam et.
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const fallback = setTimeout(done, 250);

    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clearTimeout(fallback);
          done();
        });
      });
    });
  });

  const { ensureNotificationRecipientAccount } = await import(
    '@/features/account-switch/services/ensureNotificationAccount'
  );
  const accountReady = await ensureNotificationRecipientAccount(next.eventType, next.data);

  if (!accountReady.ready) {
    if (accountReady.needsReauth) {
      const { router } = await import('expo-router');
      const { ACCOUNT_SWITCH_ROUTES } = await import('@/features/account-switch/constants');
      try {
        router.push(ACCOUNT_SWITCH_ROUTES.linkBusinessAccount as never);
      } catch {
        // Navigasyon hazır değilse sessizce geç
      }
      return;
    }

    pending = { ...next, retryCount: (next.retryCount ?? 0) + 1 };
    if ((next.retryCount ?? 0) < 3) {
      scheduleFlush(600);
    }
    return;
  }

  const { navigateFromNotification } = await import('@/lib/notifications/navigation');
  navigateFromNotification(next.eventType, next.data, next.actorId, next.notificationId);
}
