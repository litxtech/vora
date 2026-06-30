import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { NEARBY_JOBS_RADIUS_KM } from '@/features/personnel-center/constants';
import {
  fetchEmployerApplications,
  fetchMyApplications,
} from '@/features/personnel-center/services/applicationData';
import { fetchFavoriteListings } from '@/features/personnel-center/services/favoriteData';
import {
  fetchJobListings,
  fetchJobSeekers,
  fetchRecentListings,
  fetchStaffListings,
  fetchUrgentListings,
} from '@/features/personnel-center/services/listingData';
import type {
  EmployerApplication,
  JobApplication,
  JobSeekerListing,
  ListingFilters,
  PersonnelListing,
  PersonnelTab,
} from '@/features/personnel-center/types';

type TabData = {
  listings: PersonnelListing[];
  seekers: JobSeekerListing[];
  applications: JobApplication[];
  incomingApplications: EmployerApplication[];
  loading: boolean;
  error: string | null;
};

const EMPTY: TabData = {
  listings: [],
  seekers: [],
  applications: [],
  incomingApplications: [],
  loading: false,
  error: null,
};

export function usePersonnelTab(
  tab: PersonnelTab,
  regionId: string | null,
  district: string | null,
  userId: string | null,
) {
  const [data, setData] = useState<TabData>(EMPTY);

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    const baseFilters: ListingFilters = {
      regionId: regionId ?? undefined,
      district: district ?? undefined,
    };

    try {
      switch (tab) {
        case 'live': {
          setData({ ...EMPTY, loading: false, error: null });
          break;
        }
        case 'seeking': {
          const listings = await fetchJobListings(baseFilters);
          setData({ ...EMPTY, listings, loading: false, error: null });
          break;
        }
        case 'hiring': {
          const [listings, seekers] = await Promise.all([
            fetchStaffListings(baseFilters),
            fetchJobSeekers(baseFilters),
          ]);
          setData({ ...EMPTY, listings, seekers, loading: false, error: null });
          break;
        }
        case 'urgent': {
          const listings = await fetchUrgentListings(baseFilters);
          setData({ ...EMPTY, listings, loading: false, error: null });
          break;
        }
        case 'recent': {
          const listings = await fetchRecentListings(baseFilters);
          setData({ ...EMPTY, listings, loading: false, error: null });
          break;
        }
        case 'nearby': {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setData({
              ...EMPTY,
              loading: false,
              error: 'Yakınımdaki işler için konum izni gerekli.',
            });
            break;
          }
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const center = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const listings = await fetchRecentListings({
            ...baseFilters,
            center,
            radiusKm: NEARBY_JOBS_RADIUS_KM,
          });
          setData({ ...EMPTY, listings, loading: false, error: null });
          break;
        }
        case 'applications': {
          if (!userId) {
            setData({ ...EMPTY, loading: false, error: 'Giriş yapın' });
            break;
          }
          const applications = await fetchMyApplications(userId);
          setData({ ...EMPTY, applications, loading: false, error: null });
          break;
        }
        case 'incoming': {
          if (!userId) {
            setData({ ...EMPTY, loading: false, error: 'Giriş yapın' });
            break;
          }
          const incomingApplications = await fetchEmployerApplications(userId);
          setData({ ...EMPTY, incomingApplications, loading: false, error: null });
          break;
        }
        case 'favorites': {
          if (!userId) {
            setData({ ...EMPTY, loading: false, error: 'Giriş yapın' });
            break;
          }
          const listings = await fetchFavoriteListings(userId);
          setData({ ...EMPTY, listings, loading: false, error: null });
          break;
        }
        case 'live': {
          const listings = await fetchRecentListings(baseFilters);
          setData({ ...EMPTY, listings, loading: false, error: null });
          break;
        }
        case 'saved_searches': {
          setData({ ...EMPTY, loading: false, error: null });
          break;
        }
      }
    } catch {
      setData({ ...EMPTY, loading: false, error: 'Veriler yüklenemedi.' });
    }
  }, [tab, regionId, district, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refresh: load };
}
