import { useCallback, useEffect, useState } from 'react';
import { fetchIzdivacConversations } from '@/features/izdivac/services/izdivacEcosystem';
import type { IzdivacConversationItem } from '@/features/izdivac/types';

export function useIzdivacMessages() {
  const [conversations, setConversations] = useState<IzdivacConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchIzdivacConversations();
    setConversations(result.conversations);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { conversations, loading, error, refresh };
}
