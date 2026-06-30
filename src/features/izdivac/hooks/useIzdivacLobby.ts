import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  IZDIVAC_LOBBY_HEARTBEAT_MS,
  IZDIVAC_LOBBY_POLL_MS,
} from '@/features/izdivac/constants';
import {
  fetchIzdivacParticipants,
  heartbeatIzdivacLobby,
  joinIzdivacLobby,
  leaveIzdivacLobby,
} from '@/features/izdivac/services/izdivacData';
import type { IzdivacLobbyState } from '@/features/izdivac/types';
import { useIzdivacAccess } from '@/features/izdivac/hooks/useIzdivacAccess';
import { canJoinIzdivacLobby, izdivacLobbyBlockReason } from '@/features/izdivac/utils';
import { useAuth } from '@/providers/AuthProvider';
import { devWarn } from '@/lib/safeLog';

const EMPTY_LOBBY: IzdivacLobbyState = { women: [], men: [] };

export function useIzdivacLobby() {
  const { profile } = useAuth();
  const hasAccess = useIzdivacAccess();
  const canJoin = canJoinIzdivacLobby(profile);
  const lobbyBlockReason = izdivacLobbyBlockReason(profile);
  const [lobby, setLobby] = useState<IzdivacLobbyState>(EMPTY_LOBBY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(async () => {
    if (!hasAccess) {
      if (mountedRef.current) {
        setLobby(EMPTY_LOBBY);
        setError(null);
        setLoading(false);
      }
      return;
    }

    const result = await fetchIzdivacParticipants();
    if (!mountedRef.current) return;
    setLobby(result.data);
    setError(result.error);
    setLoading(false);
  }, [hasAccess]);

  useEffect(() => {
    mountedRef.current = true;
    if (!hasAccess) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    let active = true;
    let poll: ReturnType<typeof setInterval> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stopIntervals = () => {
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    const startIntervals = () => {
      if (appStateRef.current !== 'active' || poll) return;
      poll = setInterval(() => {
        if (appStateRef.current !== 'active') return;
        void refresh();
      }, IZDIVAC_LOBBY_POLL_MS);
      if (canJoin) {
        heartbeat = setInterval(() => {
          if (appStateRef.current !== 'active') return;
          void heartbeatIzdivacLobby();
        }, IZDIVAC_LOBBY_HEARTBEAT_MS);
      }
    };

    void (async () => {
      setLoading(true);
      await refresh();
      if (!active || !mountedRef.current || !canJoin) return;

      const { error: joinError } = await joinIzdivacLobby();
      if (!active || !mountedRef.current) return;
      if (joinError) {
        devWarn('izdivac', 'lobby join failed', joinError);
      } else {
        await refresh();
      }
      startIntervals();
    })();

    const appSub = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      if (state === 'active') {
        if (canJoin) void heartbeatIzdivacLobby();
        void refresh();
        startIntervals();
        return;
      }
      stopIntervals();
    });

    return () => {
      active = false;
      mountedRef.current = false;
      stopIntervals();
      appSub.remove();
      if (canJoin) void leaveIzdivacLobby();
    };
  }, [hasAccess, canJoin, refresh]);

  return {
    lobby,
    loading,
    error,
    refresh,
    hasAccess,
    canJoin,
    lobbyBlockReason,
  };
}

export type IzdivacLobbySnapshot = ReturnType<typeof useIzdivacLobby>;
