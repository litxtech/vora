import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchCallSessions, type CallSessionRow } from '@/features/admin/services/phase3Management';
import { supabase } from '@/lib/supabase/client';

const POLL_INTERVAL_MS = 8_000;

export function useAdminCallSessionsLive() {
  const [items, setItems] = useState<CallSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newLiveAlert, setNewLiveAlert] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);

  const prevLiveIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!initializedRef.current) setLoading(true);

    const data = await fetchCallSessions();
    const liveIds = new Set(data.filter((row) => row.status === 'ringing' || row.status === 'accepted').map((row) => row.id));

    if (initializedRef.current) {
      const freshLive = [...liveIds].filter((id) => !prevLiveIdsRef.current.has(id));
      if (freshLive.length > 0) {
        const session = data.find((row) => row.id === freshLive[0]);
        if (session) {
          setNewLiveAlert(`@${session.caller_username} → @${session.callee_username} araması başladı`);
        }
      }
    }

    prevLiveIdsRef.current = liveIds;
    initializedRef.current = true;
    setItems(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void load();

      return () => {
        setFocused(false);
      };
    }, [load]),
  );

  useEffect(() => {
    if (!focused) return;

    const interval = setInterval(() => {
      void load(true);
    }, POLL_INTERVAL_MS);

    const channel = supabase
      .channel('admin-call-sessions-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'call_sessions' },
        () => {
          void load(true);
        },
      )
      .subscribe();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load(true);
    });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      appStateSub.remove();
    };
  }, [focused, load]);

  const dismissAlert = useCallback(() => setNewLiveAlert(null), []);

  return {
    items,
    loading,
    refreshing,
    newLiveAlert,
    dismissAlert,
    refresh: () => load(true),
  };
}
