import * as Notifications from 'expo-notifications';
import { declineCall } from '@/features/calls/services/callService';
import {
  extractCallSessionId,
  isIncomingCallEvent,
  presentIncomingCall,
} from '@/features/calls/services/presentIncomingCall';
import {
  INCOMING_CALL_ACTION_ACCEPT,
  INCOMING_CALL_ACTION_DECLINE,
} from '@/features/calls/constants';
import { markNotificationClicked } from '@/features/notifications/services/notificationData';
import { shouldHandleNotification } from '@/lib/notifications/dedupe';
import { MESSAGE_REPLY_ACTION } from '@/features/messaging/constants/notificationReply';
import { sendMessageFromNotificationReply } from '@/features/messaging/services/notificationMessageReply';
import {
  extractNotificationEventType,
  extractNotificationId,
  extractTargetIds,
  normalizeNotificationData,
} from '@/lib/notifications/notificationPayload';
import { queueNotificationNavigation } from '@/lib/notifications/pendingNavigation';
import { supabase } from '@/lib/supabase/client';

let coldStartConsumed = false;

export function resetNotificationResponseStateForTests(): void {
  coldStartConsumed = false;
}

async function clearLastNotificationResponse(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
}

export async function trackPushNotificationOpen(
  data: Record<string, unknown>,
): Promise<void> {
  const normalized = normalizeNotificationData(data);
  const notificationId = extractNotificationId(normalized);
  const outboxId = (normalized.outboxId ?? normalized.outbox_id) as string | undefined;

  const tasks: Promise<unknown>[] = [];

  if (notificationId) {
    tasks.push(markNotificationClicked(notificationId));
  }

  if (outboxId) {
    tasks.push(
      supabase.rpc('mark_notification_delivery_opened', { p_outbox_id: outboxId }),
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}

function isIncomingCallAcceptAction(actionIdentifier?: string): boolean {
  return (
    !actionIdentifier ||
    actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ||
    actionIdentifier === INCOMING_CALL_ACTION_ACCEPT
  );
}

function handleIncomingCallNotificationResponse(
  data: Record<string, unknown>,
  actionIdentifier?: string,
): void {
  const sessionId = extractCallSessionId(data);
  if (!sessionId) return;

  void trackPushNotificationOpen(data);

  if (actionIdentifier === INCOMING_CALL_ACTION_DECLINE) {
    void declineCall(sessionId).catch(() => undefined);
    return;
  }

  if (isIncomingCallAcceptAction(actionIdentifier)) {
    void presentIncomingCall(sessionId);
  }
}

function handleMessageNotificationReply(
  data: Record<string, unknown>,
  userText?: string,
): boolean {
  const eventType = extractNotificationEventType(data);
  if (eventType !== 'message' && eventType !== 'group_message') return false;

  const replyText = userText?.trim();
  if (!replyText) return false;

  const { conversationId } = extractTargetIds(data);
  if (!conversationId) return false;

  void trackPushNotificationOpen(data);
  void sendMessageFromNotificationReply(conversationId, replyText);
  return true;
}

export function handleNotificationResponse(
  data: Record<string, unknown>,
  options?: { actionIdentifier?: string; userText?: string },
): void {
  void clearLastNotificationResponse();

  const normalized = normalizeNotificationData(data);
  if (!shouldHandleNotification(normalized)) return;

  const eventType = extractNotificationEventType(normalized);
  if (!eventType) return;

  if (isIncomingCallEvent(eventType)) {
    handleIncomingCallNotificationResponse(normalized, options?.actionIdentifier);
    return;
  }

  if (
    options?.actionIdentifier === MESSAGE_REPLY_ACTION &&
    handleMessageNotificationReply(normalized, options.userText)
  ) {
    return;
  }

  void trackPushNotificationOpen(normalized);
  queueNotificationNavigation(normalized);
}

export async function handleColdStartNotificationResponse(): Promise<void> {
  if (coldStartConsumed) return;
  coldStartConsumed = true;

  const last = await Notifications.getLastNotificationResponseAsync();
  if (!last) return;

  const data = last.notification.request.content.data as Record<string, unknown>;
  handleNotificationResponse(data, {
    actionIdentifier: last.actionIdentifier,
    userText: last.userText,
  });
}
