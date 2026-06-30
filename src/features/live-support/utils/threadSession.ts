import type { LiveSupportMessage, LiveSupportStatus } from '@/features/live-support/types';

const INACTIVE_STATUSES: LiveSupportStatus[] = ['closed', 'resolved', 'no_response'];

export function isLiveSupportThreadInactive(status: LiveSupportStatus | null | undefined): boolean {
  if (!status) return false;
  return INACTIVE_STATUSES.includes(status);
}

export function filterLiveSupportSessionMessages(
  messages: LiveSupportMessage[],
  sessionStartAt: string | null,
): LiveSupportMessage[] {
  if (!sessionStartAt) return messages;
  return messages.filter(
    (message) => message.id.startsWith('local-') || message.created_at >= sessionStartAt,
  );
}
