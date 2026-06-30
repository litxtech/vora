import { useEffect } from 'react';
import { hydrateMessageDrafts, resetMessageDraftsForUser } from '../services/messageDrafts';

/** Oturum açılınca taslakları diskten yükler. */
export function useMessageDrafts(userId: string | undefined) {
  useEffect(() => {
    if (!userId) {
      resetMessageDraftsForUser();
      return;
    }
    void hydrateMessageDrafts(userId);
  }, [userId]);
}
