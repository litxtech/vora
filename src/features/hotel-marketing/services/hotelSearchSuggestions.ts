import AsyncStorage from '@react-native-async-storage/async-storage';
import { regionNameById } from '@/constants/regions';
import { HOTEL_MARKETING_POPULAR_SEARCHES } from '@/features/hotel-marketing/constants';
import { adminSearchHotelsForMarketing } from '@/features/hotel-marketing/services/adminHotelMarketing';
import type { AdminHotelSearchResult } from '@/features/hotel-marketing/types';

const RECENT_KEY = 'admin_hotel_marketing_recent_searches_v1';
const RECENT_LIMIT = 6;

export type HotelSearchSuggestionKind = 'recent' | 'popular' | 'hotel' | 'district';

export type HotelSearchSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
  kind: HotelSearchSuggestionKind;
  searchQuery: string;
  hotel?: AdminHotelSearchResult;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function matchesQuery(label: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return normalize(label).includes(q);
}

async function readRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

export async function saveRecentHotelMarketingSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const recent = await readRecentSearches();
  const next = [trimmed, ...recent.filter((r) => normalize(r) !== normalize(trimmed))].slice(0, RECENT_LIMIT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function popularSuggestions(query: string): HotelSearchSuggestion[] {
  return HOTEL_MARKETING_POPULAR_SEARCHES.filter((term) => matchesQuery(term, query)).map((term) => ({
    id: `popular-${term}`,
    label: term,
    subtitle: 'Popüler arama',
    kind: 'popular' as const,
    searchQuery: term,
  }));
}

function recentSuggestions(recent: string[], query: string): HotelSearchSuggestion[] {
  return recent
    .filter((term) => matchesQuery(term, query))
    .map((term) => ({
      id: `recent-${term}`,
      label: term,
      subtitle: 'Son arama',
      kind: 'recent' as const,
      searchQuery: term,
    }));
}

function hotelSuggestions(hotels: AdminHotelSearchResult[], query: string): HotelSearchSuggestion[] {
  const seenDistricts = new Set<string>();
  const items: HotelSearchSuggestion[] = [];

  for (const hotel of hotels) {
    items.push({
      id: `hotel-${hotel.id}`,
      label: hotel.name,
      subtitle: [regionNameById(hotel.regionId), hotel.district].filter(Boolean).join(' · '),
      kind: 'hotel',
      searchQuery: hotel.name,
      hotel,
    });

    if (hotel.district && matchesQuery(hotel.district, query) && !seenDistricts.has(hotel.district)) {
      seenDistricts.add(hotel.district);
      items.push({
        id: `district-${hotel.district}`,
        label: hotel.district,
        subtitle: `${regionNameById(hotel.regionId)} · İlçe`,
        kind: 'district',
        searchQuery: hotel.district,
      });
    }
  }

  return items;
}

export async function fetchHotelMarketingSearchSuggestions(query: string): Promise<HotelSearchSuggestion[]> {
  const trimmed = query.trim();
  const recent = await readRecentSearches();

  if (!trimmed) {
    const featured = await adminSearchHotelsForMarketing('');
    return [
      ...recentSuggestions(recent, ''),
      ...popularSuggestions(''),
      ...hotelSuggestions(featured.slice(0, 8), ''),
    ].slice(0, 12);
  }

  const hotels = await adminSearchHotelsForMarketing(trimmed);
  return [
    ...recentSuggestions(recent, trimmed),
    ...popularSuggestions(trimmed),
    ...hotelSuggestions(hotels, trimmed),
  ].slice(0, 14);
}
