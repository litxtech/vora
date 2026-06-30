import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

type MapLocationState = {
  granted: boolean;
  coords: { latitude: number; longitude: number } | null;
  loading: boolean;
};

export function useMapLocation(enabled = true) {
  const [state, setState] = useState<MapLocationState>({
    granted: false,
    coords: null,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) {
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      return;
    }

    let cancelled = false;

    async function load() {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === 'granted';

      if (!granted) {
        if (!cancelled) {
          setState({ granted: false, coords: null, loading: false });
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!cancelled) {
        setState({
          granted: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          loading: false,
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
