import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

const AUTO_REFRESH_MS = 60_000;

/** Android: periyodik yenileme Mapbox bellek patlatıyor — yalnızca manuel yenile. */
export function useMapAutoRefresh(refresh: (options?: { silent?: boolean }) => Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') return undefined;

      const interval = setInterval(() => {
        void refresh({ silent: true });
      }, AUTO_REFRESH_MS);

      return () => clearInterval(interval);
    }, [refresh]),
  );
}
