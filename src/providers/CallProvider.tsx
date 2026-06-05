import { router } from 'expo-router';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';
import type { CallSession } from '@/features/calls/types';

type CallContextValue = {
  startOutgoingCall: (session: CallSession) => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `callee_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as CallSession;
          if (session.status === 'ringing') {
            router.push({ pathname: '/call/[sessionId]', params: { sessionId: session.id } });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `caller_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as CallSession;
          if (session.status === 'accepted') {
            router.push({ pathname: '/call/[sessionId]', params: { sessionId: session.id } });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const value: CallContextValue = {
    startOutgoingCall: (session) => {
      router.push({ pathname: '/call/[sessionId]', params: { sessionId: session.id } });
    },
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCallNavigation() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallNavigation CallProvider içinde kullanılmalı.');
  }
  return context;
}
