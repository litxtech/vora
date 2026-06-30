import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { NEARBY_EVENTS_RADIUS_KM } from '@/features/events/constants';
import {
  fetchAttendingEvents,
  fetchFollowedEvents,
  fetchMyEvents,
  fetchUpcomingEvents,
} from '@/features/events/services/eventData';
import { distanceKm } from '@/features/map/utils/geo';
import type { EventListing, EventTab } from '@/features/events/types';

type TabData = {
  events: EventListing[];
  loading: boolean;
  error: string | null;
};

const EMPTY: TabData = { events: [], loading: false, error: null };

export function useEventTab(tab: EventTab, regionId: string | null, userId: string | null) {
  const [data, setData] = useState<TabData>(EMPTY);

  const load = useCallback(async () => {
    if (!regionId && tab !== 'mine' && tab !== 'attending' && tab !== 'following') {
      setData({ events: [], loading: false, error: null });
      return;
    }

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let events: EventListing[] = [];

      switch (tab) {
        case 'upcoming':
          events = await fetchUpcomingEvents(regionId!, userId);
          break;
        case 'nearby': {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setData({ events: [], loading: false, error: 'Konum izni gerekli.' });
            return;
          }
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const center = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const upcoming = await fetchUpcomingEvents(regionId!, userId);
          events = upcoming
            .map((e) => {
              if (e.latitude != null && e.longitude != null) {
                return { ...e, distanceKm: distanceKm(center, { latitude: e.latitude, longitude: e.longitude }) };
              }
              return e;
            })
            .filter((e) => e.distanceKm != null && e.distanceKm <= NEARBY_EVENTS_RADIUS_KM)
            .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
          break;
        }
        case 'mine':
          if (!userId) {
            setData({ events: [], loading: false, error: null });
            return;
          }
          events = await fetchMyEvents(userId);
          break;
        case 'attending':
          if (!userId) {
            setData({ events: [], loading: false, error: null });
            return;
          }
          events = await fetchAttendingEvents(userId);
          break;
        case 'following':
          if (!userId) {
            setData({ events: [], loading: false, error: null });
            return;
          }
          events = await fetchFollowedEvents(userId);
          break;
      }

      setData({ events, loading: false, error: null });
    } catch {
      setData({ events: [], loading: false, error: 'Etkinlikler yüklenemedi.' });
    }
  }, [tab, regionId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refresh: load };
}
