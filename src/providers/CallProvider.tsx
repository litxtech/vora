import { usePathname } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { AppState, StyleSheet, View, type AppStateStatus } from 'react-native';
import { CallFloatingBubble } from '@/features/calls/components/CallFloatingBubble';
import { isOnCallScreen, openCallScreen } from '@/features/calls/services/callNavigation';
import { presentIncomingCall } from '@/features/calls/services/presentIncomingCall';
import { cleanupStaleAcceptedCalls } from '@/features/calls/services/staleCallCleanup';
import { useCallAppLifecycle } from '@/features/calls/hooks/useCallAppLifecycle';
import { useCallSessionSync } from '@/features/calls/hooks/useCallSessionSync';
import { useCallStore } from '@/features/calls/store/callStore';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { useAuth } from './AuthProvider';
import type { CallSession } from '@/features/calls/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type CallContextValue = {
  startOutgoingCall: (session: CallSession) => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useCallSessionSync();
  useCallAppLifecycle();

  const navigateToCall = useCallback((sessionId: string) => {
    if (isOnCallScreen(pathnameRef.current, sessionId)) return;
    openCallScreen(sessionId);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void cleanupStaleAcceptedCalls(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let deferTask: { cancel: () => void } | null = null;
    const userId = user.id;

    const disconnect = async () => {
      if (!channel) return;
      const stale = channel;
      channel = null;
      await supabase.removeChannel(stale);
    };

    const connect = () => {
      if (cancelled || AppState.currentState !== 'active') return;

      void (async () => {
        try {
          await disconnect();
          if (cancelled || AppState.currentState !== 'active') return;

          const nextChannel = await subscribeSupabaseChannel(
            `incoming-calls-${userId}`,
            (ch) =>
              ch.on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'call_sessions',
                  filter: `callee_id=eq.${userId}`,
                },
                (payload) => {
                  const session = payload.new as CallSession;
                  if (session.status !== 'ringing') return;
                  void presentIncomingCall(session.id, {
                    currentUserId: userId,
                    pathname: pathnameRef.current,
                  });
                },
              ),
          );

          if (cancelled || AppState.currentState !== 'active') {
            await supabase.removeChannel(nextChannel);
            return;
          }

          channel = nextChannel;
        } catch {
          // Realtime kurulamazsa push / inbox yolu devreye girer
        }
      })();
    };

    const scheduleConnect = (delayMs: number) => {
      if (cancelled || AppState.currentState !== 'active') return;
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      if (delayMs > 0) {
        timer = setTimeout(connect, delayMs);
      } else {
        deferTask = deferBackgroundWork(connect);
      }
    };

    scheduleConnect(getHeavyFeatureBootDelayMs('calls'));

    const appSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        scheduleConnect(0);
        return;
      }
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      void disconnect();
    });

    return () => {
      cancelled = true;
      appSub.remove();
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      void disconnect();
    };
  }, [user?.id]);

  const startOutgoingCall = useCallback(
    (session: CallSession) => {
      useCallStore.getState().setSession(session);
      navigateToCall(session.id);
    },
    [navigateToCall],
  );

  const value = useMemo<CallContextValue>(
    () => ({ startOutgoingCall }),
    [startOutgoingCall],
  );

  return (
    <CallContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <CallFloatingBubble />
      </View>
    </CallContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export function useCallNavigation() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallNavigation CallProvider içinde kullanılmalı.');
  }
  return context;
}
