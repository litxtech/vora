import type { CallParticipant } from './types';

export function uidFromUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2_147_483_647 || 1;
}

export function displayName(participant?: CallParticipant | null): string {
  if (!participant) return 'Bilinmeyen';
  return participant.full_name?.trim() || participant.username;
}

export function formatCallDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function buildChannelName(callerId: string, calleeId: string): string {
  const sorted = [callerId, calleeId].sort().join('_');
  return `kd_${sorted.slice(0, 40)}_${Date.now()}`;
}
