const handledNotificationKeys = new Set<string>();

export function buildNotificationDedupeKey(data: Record<string, unknown>): string | null {
  const notificationId = (data.notificationId ?? data.notification_id) as string | undefined;
  const outboxId = (data.outboxId ?? data.outbox_id) as string | undefined;
  const kind = (data.kind as string | undefined) ?? 'generic';
  const requestId = (data.request_id as string | undefined) ?? '';
  const ticketId = (data.ticket_id as string | undefined) ?? '';

  if (notificationId) return `notification:${notificationId}`;
  if (outboxId) return `outbox:${outboxId}:${kind}:${requestId}:${ticketId}`;
  if (requestId) return `request:${requestId}:${kind}`;
  if (ticketId) return `ticket:${ticketId}:${kind}`;
  return null;
}

export function shouldHandleNotification(data: Record<string, unknown>): boolean {
  const key = buildNotificationDedupeKey(data);
  if (!key) return true;
  if (handledNotificationKeys.has(key)) return false;
  handledNotificationKeys.add(key);
  return true;
}

export function resetNotificationDedupeForTests(): void {
  handledNotificationKeys.clear();
}
