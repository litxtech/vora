import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getChatPollIntervalMs } from '@/lib/device/androidPerfProfile';

type UseChatBackgroundSyncOptions = {
  enabled: boolean;
  /** Ekrana dönünce tam senkron (çık-gir kaçırılanlar). */
  onFocusRefresh: () => void | Promise<void>;
  /** Odaktayken periyodik artımlı senkron. */
  onPollRefresh: () => void | Promise<void>;
};

export function useChatBackgroundSync({
  enabled,
  onFocusRefresh,
  onPollRefresh,
}: UseChatBackgroundSyncOptions) {
  const focusRef = useRef(onFocusRefresh);
  const pollRef = useRef(onPollRefresh);
  focusRef.current = onFocusRefresh;
  pollRef.current = onPollRefresh;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      void focusRef.current();
      void pollRef.current();
      const interval = setInterval(() => {
        void pollRef.current();
      }, getChatPollIntervalMs());

      return () => clearInterval(interval);
    }, [enabled]),
  );

  useEffect(() => {
    if (!enabled) return;

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void pollRef.current();
    });

    return () => sub.remove();
  }, [enabled]);
}
