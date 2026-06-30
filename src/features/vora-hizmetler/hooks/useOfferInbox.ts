import { useCallback, useEffect, useState } from 'react';
import { fetchUserOfferInbox } from '@/features/vora-hizmetler/services/offerData';
import type { ServiceOfferInboxItem } from '@/features/vora-hizmetler/types';

export function useOfferInbox(userId: string | null, providerId: string | null | undefined) {
  const [items, setItems] = useState<ServiceOfferInboxItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reloadInbox = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const result = await fetchUserOfferInbox(userId, providerId);
    setItems(result.items);
    setLoading(false);
  }, [userId, providerId]);

  useEffect(() => {
    void reloadInbox();
  }, [reloadInbox]);

  const incoming = items.filter((item) => item.direction === 'incoming');
  const outgoing = items.filter((item) => item.direction === 'outgoing');

  return { items, incoming, outgoing, loading, reloadInbox };
}
