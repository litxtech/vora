import type { CallLogMetadata } from '../types';

export function parseCallLogMetadata(metadata: unknown): CallLogMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const row = metadata as Record<string, unknown>;
  const callSessionId = typeof row.callSessionId === 'string' ? row.callSessionId : null;
  const callType = row.callType === 'video' || row.callType === 'audio' ? row.callType : null;
  const status =
    row.status === 'ended' ||
    row.status === 'missed' ||
    row.status === 'declined' ||
    row.status === 'cancelled'
      ? row.status
      : null;
  const callerId = typeof row.callerId === 'string' ? row.callerId : null;
  const calleeId = typeof row.calleeId === 'string' ? row.calleeId : null;

  if (!callSessionId || !callType || !status || !callerId || !calleeId) return null;

  return {
    callSessionId,
    callType,
    status,
    callerId,
    calleeId,
    startedAt: typeof row.startedAt === 'string' ? row.startedAt : null,
    endedAt: typeof row.endedAt === 'string' ? row.endedAt : null,
    durationSec: typeof row.durationSec === 'number' ? row.durationSec : 0,
  };
}
