import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { fetchUserSessions, type UserSessionRow } from '@/features/admin/services/phase2Management';
import { fetchAdminUserPresence, type AdminUserPresence } from '@/features/admin/services/userManagement';

const POLL_INTERVAL_MS = 30_000;

export function useAdminUserDetailLive(userId: string | undefined, enabled = true) {
  const [presence, setPresence] = useState<AdminUserPresence | null>(null);
  const [sessions, setSessions] = useState<UserSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const refreshPresence = useCallback(async () => {
    if (!userId || !enabled) return;
    const { data } = await fetchAdminUserPresence(userId);
    if (data) setPresence(data);
  }, [enabled, userId]);

  const refreshSessions = useCallback(async () => {
    if (!userId || !enabled) return;
    const data = await fetchUserSessions(userId);
    setSessions(data);
    setSessionsLoading(false);
  }, [enabled, userId]);

  const refreshLive = useCallback(async () => {
    await Promise.all([refreshPresence(), refreshSessions()]);
  }, [refreshPresence, refreshSessions]);

  useEffect(() => {
    if (!userId || !enabled) return;

    void refreshLive();

    const interval = setInterval(() => {
      void refreshLive();
    }, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshLive();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [enabled, refreshLive, userId]);

  return {
    presence,
    sessions,
    sessionsLoading,
    refreshLive,
    refreshSessions,
    refreshPresence,
  };
}
