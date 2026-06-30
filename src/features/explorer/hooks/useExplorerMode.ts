import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Alert } from 'react-native';
import { useIsFocused } from 'expo-router';
import * as Location from 'expo-location';
import {
  EXPLORER_DISTANCE_INTERVAL_M,
  EXPLORER_UPDATE_INTERVAL_MS,
} from '@/features/explorer/constants';
import {
  clearExplorerPresence,
  publishExplorerPresence,
} from '@/features/explorer/services/explorerPresence';
import { useExplorerRegionId } from '@/features/explorer/hooks/useExplorerRegionId';
import { useExplorerStore } from '@/features/explorer/store/explorerStore';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import { useAuth } from '@/providers/AuthProvider';

export function useExplorerMode() {
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const regionId = useExplorerRegionId();
  const modeEnabled = useExplorerStore((s) => s.modeEnabled);
  const hydrated = useExplorerStore((s) => s.hydrated);
  const setModeEnabled = useExplorerStore((s) => s.setModeEnabled);
  const hydrate = useExplorerStore((s) => s.hydrate);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const publishingRef = useRef(false);
  const appActiveRef = useRef(true);
  const watcherOpRef = useRef(0);

  const stopWatcher = useCallback(async () => {
    watcherOpRef.current += 1;

    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }

    if (user?.id) {
      await clearExplorerPresence();
    }
  }, [user?.id]);

  const publish = useCallback(
    async (position: Location.LocationObject): Promise<string | null> => {
      if (!user?.id || publishingRef.current || !appActiveRef.current) {
        return 'Oturum hazır değil.';
      }

      publishingRef.current = true;
      const { error } = await publishExplorerPresence(
        regionId,
        position.coords.latitude,
        position.coords.longitude,
        position.coords.heading ?? null,
      );
      publishingRef.current = false;

      if (error) {
        console.warn('[explorer] publish failed:', error);
        return error;
      }

      return null;
    },
    [regionId, user?.id],
  );

  const startWatcher = useCallback(async () => {
    const op = watcherOpRef.current + 1;
    watcherOpRef.current = op;

    const { error: profileError } = await ensureCurrentUserProfile();
    if (watcherOpRef.current !== op) return;

    if (profileError) {
      Alert.alert('Kaşif modu', profileError);
      setModeEnabled(false);
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (watcherOpRef.current !== op) return;

    if (status !== 'granted') {
      Alert.alert(
        'Konum izni gerekli',
        'Kaşif modunda görünmek için konum iznine ihtiyacımız var.',
      );
      setModeEnabled(false);
      return;
    }

    let initial: Location.LocationObject;
    try {
      initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      Alert.alert('Kaşif modu', 'Konumunuz alınamadı. GPS açık mı kontrol edin.');
      setModeEnabled(false);
      return;
    }

    if (watcherOpRef.current !== op) return;

    const publishError = await publish(initial);
    if (watcherOpRef.current !== op) return;

    if (publishError) {
      Alert.alert('Kaşif modu', publishError);
      setModeEnabled(false);
      return;
    }

    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: EXPLORER_UPDATE_INTERVAL_MS,
        distanceInterval: EXPLORER_DISTANCE_INTERVAL_M,
      },
      (position) => {
        void publish(position);
      },
    );
  }, [publish, setModeEnabled]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !user?.id || !isFocused) {
      void stopWatcher();
      return;
    }

    if (modeEnabled) {
      void startWatcher();
    } else {
      void stopWatcher();
    }

    return () => {
      void stopWatcher();
    };
  }, [hydrated, modeEnabled, user?.id, isFocused, startWatcher, stopWatcher]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      const active = state === 'active';
      appActiveRef.current = active;

      if (!modeEnabled || !isFocused || !user?.id) return;

      if (active) {
        void startWatcher();
      } else {
        void stopWatcher();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [modeEnabled, isFocused, startWatcher, stopWatcher, user?.id]);

  const toggleExplorerMode = useCallback(async () => {
    if (!(await requireAuth('Kaşif modu'))) return;

    setModeEnabled(!modeEnabled);
  }, [modeEnabled, requireAuth, setModeEnabled]);

  return {
    modeEnabled,
    hydrated,
    toggleExplorerMode,
    canUseExplorer: Boolean(user?.id),
  };
}
