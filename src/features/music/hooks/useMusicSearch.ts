import { useEffect, useMemo, useState } from 'react';
import { MUSIC_SEARCH_DEBOUNCE_MS } from '@/features/music/constants';
import { searchMusic } from '@/features/music/services/musicData';
import type { MusicTrack } from '@/features/music/types';

export function useMusicSearch(query: string) {
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [searching, setSearching] = useState(false);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const tracks = await searchMusic(trimmed);
      setResults(tracks);
      setSearching(false);
    }, MUSIC_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed]);

  return { results, searching, hasQuery: trimmed.length > 0 };
}
