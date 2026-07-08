import { useEffect, useRef, useState } from 'react';
import { SOUND_SEARCH_DEBOUNCE_MS } from '@/features/sounds/constants';
import { searchSounds } from '@/features/sounds/services/soundData';
import type { Sound } from '@/features/sounds/types';

export function useSoundSearch(query: string) {
  const [results, setResults] = useState<Sound[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  useEffect(() => {
    if (!hasQuery) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void searchSounds(trimmed).then((items) => {
        setResults(items);
        setSearching(false);
      });
    }, SOUND_SEARCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasQuery, trimmed]);

  return { results, searching, hasQuery };
}
