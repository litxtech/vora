import { router } from 'expo-router';

export function openCallScreen(sessionId: string) {
  router.push({ pathname: '/call/[sessionId]', params: { sessionId } });
}

export function isOnCallScreen(pathname: string | null, sessionId: string): boolean {
  if (!pathname || !sessionId) return false;
  if (!pathname.includes('/call')) return false;
  return pathname.includes(sessionId);
}

export function hasActiveCallSession(
  session: { id: string; status: string } | null,
  isJoined: boolean,
): boolean {
  return Boolean(session?.id && session.status === 'accepted' && isJoined);
}
