import { useEffect, useState } from 'react';
import { DISCOVERY_USER_SEARCH_MIN_LENGTH } from '@/features/discovery/constants';
import { searchDiscoverUsers } from '@/features/discovery/services/userSearch';
import type { DiscoveryUserResult } from '@/features/discovery/types';
import { useAuth } from '@/providers/AuthProvider';

export function useDiscoveryUserSearch(query: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<DiscoveryUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const q = query.trim();
    if (q.length < DISCOVERY_USER_SEARCH_MIN_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchDiscoverUsers(q);
        setResults(found);
        setError(null);
      } catch {
        setResults([]);
        setError('Kullanıcı araması başarısız.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.id]);

  return { results, loading, error };
}
