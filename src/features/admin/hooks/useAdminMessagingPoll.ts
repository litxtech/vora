import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchMessagingModerationReports, type MessagingReportRow } from '@/features/admin/services/messagingModeration';
import { supabase } from '@/lib/supabase/client';

const POLL_INTERVAL_MS = 15_000;

export function useAdminMessagingPoll() {
  const [items, setItems] = useState<MessagingReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newReportAlert, setNewReportAlert] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);

  const prevPendingRef = useRef(0);
  const initializedRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!initializedRef.current) setLoading(true);

    const { data, error: fetchError } = await fetchMessagingModerationReports();

    if (fetchError) {
      setError(fetchError);
    } else {
      setError(null);

      const pending = data.filter((row) => row.status === 'pending').length;
      if (initializedRef.current && pending > prevPendingRef.current) {
        const fresh = pending - prevPendingRef.current;
        setNewReportAlert(`${fresh} yeni mesaj şikayeti`);
      }
      prevPendingRef.current = pending;
    }

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
      .channel('admin-messaging-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_reports' },
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

  const dismissAlert = useCallback(() => setNewReportAlert(null), []);

  return {
    items,
    loading,
    refreshing,
    error,
    newReportAlert,
    dismissAlert,
    refresh: () => load(true),
  };
}
