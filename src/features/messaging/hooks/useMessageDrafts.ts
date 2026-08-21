import { useEffect } from 'react';
import { hydrateMessageDrafts, resetMessageDraftsForUser } from '../services/messageDrafts';
import { shouldDeferHeavyFocusWork } from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';

/** Oturum açılınca taslakları diskten yükler. */
export function useMessageDrafts(userId: string | undefined) {
  useEffect(() => {
    if (!userId) {
      resetMessageDraftsForUser();
      return;
    }

    const run = () => {
      void hydrateMessageDrafts(userId);
    };

    if (shouldDeferHeavyFocusWork()) {
      const task = deferBackgroundWork(run);
      return () => task.cancel();
    }

    run();
    return undefined;
  }, [userId]);
}
