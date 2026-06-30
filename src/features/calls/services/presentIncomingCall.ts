import { InteractionManager } from 'react-native';
import { fetchCallSession } from '@/features/calls/services/callService';
import { isOnCallScreen, openCallScreen } from '@/features/calls/services/callNavigation';
import { useCallStore } from '@/features/calls/store/callStore';
import type { NotificationEventType } from '@/constants/notifications';
import { extractTargetIds } from '@/lib/notifications/notificationPayload';
import { supabase } from '@/lib/supabase/client';

const INCOMING_CALL_EVENTS = new Set<NotificationEventType>(['call_incoming', 'call_video']);

let presentingSessionId: string | null = null;

export function isIncomingCallEvent(
  eventType: string | null | undefined,
): eventType is NotificationEventType {
  return !!eventType && INCOMING_CALL_EVENTS.has(eventType as NotificationEventType);
}

export function extractCallSessionId(data: Record<string, unknown>): string | null {
  return extractTargetIds(data).callSessionId;
}

async function waitForNavigationReady(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Karşı tarafa gelen arama ekranını açar (realtime, push veya inbox). */
export async function presentIncomingCall(
  sessionId: string,
  options?: {
    currentUserId?: string | null;
    pathname?: string | null;
  },
): Promise<void> {
  if (!sessionId) return;
  if (options?.pathname && isOnCallScreen(options.pathname, sessionId)) return;
  if (presentingSessionId === sessionId) return;

  presentingSessionId = sessionId;

  try {
    let currentUserId = options?.currentUserId ?? null;
    if (!currentUserId) {
      const { data } = await supabase.auth.getUser();
      currentUserId = data.user?.id ?? null;
    }
    if (!currentUserId) return;

    const data = await fetchCallSession(sessionId);
    if (!data || data.status !== 'ringing' || data.callee_id !== currentUserId) return;

    useCallStore.getState().setSession(data);
    await waitForNavigationReady();
    openCallScreen(sessionId);
  } catch {
    // Oturum okunamadı veya navigasyon hazır değil — sessizce geç
  } finally {
    if (presentingSessionId === sessionId) {
      presentingSessionId = null;
    }
  }
}

export function presentIncomingCallFromNotification(
  data: Record<string, unknown>,
  options?: {
    currentUserId?: string | null;
    pathname?: string | null;
  },
): void {
  const sessionId = extractCallSessionId(data);
  if (!sessionId) return;
  void presentIncomingCall(sessionId, options);
}
