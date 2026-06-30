import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { isOnCallScreen } from '@/features/calls/services/callNavigation';
import { useCallStore } from '@/features/calls/store/callStore';
import { TERMINAL_CALL_STATUSES } from '@/features/calls/types';
import type { CallSession } from '@/features/calls/types';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';

/** Görüşme ekranı dışındayken oturum güncellemelerini dinle ve bitişte temizle. */
export function useCallSessionSync() {
  const sessionId = useCallStore((s) => s.session?.id ?? null);
  const pathname = usePathname();
  const onCallScreen = sessionId ? isOnCallScreen(pathname, sessionId) : false;

  useEffect(() => {
    if (!sessionId || onCallScreen) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      try {
        const nextChannel = await subscribeSupabaseChannel(
          `call-session-global-${sessionId}`,
          (ch) =>
            ch.on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'call_sessions',
                filter: `id=eq.${sessionId}`,
              },
              (payload) => {
                const next = payload.new as CallSession;
                const store = useCallStore.getState();
                store.patchSession(next);

                if (TERMINAL_CALL_STATUSES.includes(next.status)) {
                  void (async () => {
                    const { leaveAgoraChannel } = await import('@/features/calls/services/agoraCallEngine');
                    await leaveAgoraChannel();
                    store.reset();
                  })();
                }
              },
            ),
        );

        if (cancelled) {
          await supabase.removeChannel(nextChannel);
          return;
        }

        channel = nextChannel;
      } catch {
        // Kanal kurulamazsa sessizce atla; ekran kendi aboneliğini yönetir.
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [onCallScreen, sessionId]);
}
