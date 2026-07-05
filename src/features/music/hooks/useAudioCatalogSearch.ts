import { useEffect, useMemo, useState } from 'react';
import { MUSIC_SEARCH_DEBOUNCE_MS } from '@/features/music/constants';
import { searchAudioCatalog } from '@/features/music/services/audioCatalog';
import type { AudioCatalogItem } from '@/features/music/types';

export function useAudioCatalogSearch(query: string) {
  const [results, setResults] = useState<AudioCatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      void searchAudioCatalog(trimmed).then((items) => {
        setResults(items);
        setSearching(false);
      });
    }, MUSIC_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed]);

  return { results, searching, hasQuery: trimmed.length > 0 };
}
