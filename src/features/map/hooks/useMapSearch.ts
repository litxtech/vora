import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LOCATION_SEARCH_MIN_CHARS } from '@/features/map/constants';
import { searchMapLocations } from '@/features/map/services/locationSearch';
import {
  mergeMapSearchHits,
  searchLocalMapMarkers,
  splitMapSearchHits,
  type MapSearchHit,
} from '@/features/map/services/mapSearch';
import { useMapStore } from '@/features/map/store/mapStore';
import type { MapCoordinate, MapLocationSuggestion, MapMarker } from '@/features/map/types';
import type { RegionId } from '@/constants/regions';

type UseMapSearchOptions = {
  regionId: RegionId;
  markers: MapMarker[];
  proximity?: MapCoordinate | null;
};

export function useMapSearch({ regionId, markers, proximity }: UseMapSearchOptions) {
  const query = useMapStore((s) => s.searchQuery);
  const setQuery = useMapStore((s) => s.setSearchQuery);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<MapLocationSuggestion[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(`map-${Date.now()}`);

  const localHits = useMemo(
    () => searchLocalMapMarkers(markers, query),
    [markers, query],
  );

  const hits = useMemo(
    () => mergeMapSearchHits(localHits, remoteSuggestions),
    [localHits, remoteSuggestions],
  );

  const { onMap, places } = useMemo(() => splitMapSearchHits(hits), [hits]);

  const runRemoteSearch = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < LOCATION_SEARCH_MIN_CHARS) {
        setRemoteSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const results = await searchMapLocations(trimmed, regionId, {
          proximity: proximity ?? undefined,
          sessionToken: sessionTokenRef.current,
        });
        setRemoteSuggestions(results);
      } catch {
        setRemoteSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [regionId, proximity],
  );

  const handleChangeQuery = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runRemoteSearch(text);
      }, 300);
    },
    [runRemoteSearch, setQuery],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setRemoteSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [setQuery]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (query.trim().length >= LOCATION_SEARCH_MIN_CHARS) {
      void runRemoteSearch(query);
    }
  }, [query, runRemoteSearch]);

  const setSuggestionsClosed = useCallback(() => {
    setFocused(false);
    setRemoteSuggestions([]);
  }, []);

  const beginResolve = useCallback((id: string) => {
    setResolvingId(id);
  }, []);

  const endResolve = useCallback(() => {
    setResolvingId(null);
    setSuggestionsClosed();
    sessionTokenRef.current = `map-${Date.now()}`;
  }, [setSuggestionsClosed]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showPanel =
    focused &&
    (loading ||
      query.trim().length >= LOCATION_SEARCH_MIN_CHARS ||
      localHits.length > 0 ||
      query.trim().length > 0);

  return {
    query,
    focused,
    loading,
    resolvingId,
    hits,
    onMap,
    places,
    showPanel,
    setFocused,
    handleChangeQuery,
    clearSearch,
    handleFocus,
    beginResolve,
    endResolve,
    setSuggestionsClosed,
  };
}

export type { MapSearchHit };
