import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { NEARBY_LOST_RADIUS_KM } from '@/features/lost-found/constants';
import { fetchLostListings } from '@/features/lost-found/services/lostItemData';
import type { LostListing, LostTab } from '@/features/lost-found/types';

type TabData = {
  listings: LostListing[];
  loading: boolean;
  error: string | null;
};

const EMPTY: TabData = { listings: [], loading: false, error: null };

export function useLostTab(tab: LostTab, regionId: string | null, userId: string | null) {
  const [data, setData] = useState<TabData>(EMPTY);

  const load = useCallback(async () => {
    if (!regionId && tab !== 'mine') {
      setData({ listings: [], loading: false, error: null });
      return;
    }

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let listings: LostListing[] = [];

      switch (tab) {
        case 'lost':
          listings = await fetchLostListings(regionId!, { itemType: 'lost', status: 'open' });
          break;
        case 'found':
          listings = await fetchLostListings(regionId!, { itemType: 'found', status: 'open' });
          break;
        case 'urgent':
          listings = await fetchLostListings(regionId!, { status: 'open', urgentOnly: true });
          break;
        case 'recent':
          listings = await fetchLostListings(regionId!, { status: 'open' });
          break;
        case 'nearby': {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setData({ listings: [], loading: false, error: 'Konum izni gerekli.' });
            return;
          }
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const center = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          listings = await fetchLostListings(regionId!, {
            status: 'open',
            center,
            radiusKm: NEARBY_LOST_RADIUS_KM,
          });
          break;
        }
        case 'mine':
          if (!userId) {
            setData({ listings: [], loading: false, error: null });
            return;
          }
          listings = await fetchLostListings(regionId ?? 'trabzon', { authorId: userId });
          break;
        case 'resolved':
          listings = await fetchLostListings(regionId!, { status: 'resolved' });
          break;
      }

      setData({ listings, loading: false, error: null });
    } catch {
      setData({ listings: [], loading: false, error: 'İlanlar yüklenemedi.' });
    }
  }, [tab, regionId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refresh: load };
}
