import { useEffect } from 'react';
import { CALL_RING_TIMEOUT_MS } from '@/features/calls/constants';
import type { CallScreenMode, CallStatus } from '@/features/calls/types';

type UseCallRingTimeoutOptions = {
  sessionId: string | undefined;
  status: CallStatus | undefined;
  mode: CallScreenMode;
  enabled: boolean;
  onTimeout: () => void | Promise<void>;
};

export function useCallRingTimeout({
  sessionId,
  status,
  mode,
  enabled,
  onTimeout,
}: UseCallRingTimeoutOptions) {
  useEffect(() => {
    if (!enabled || !sessionId || status !== 'ringing') return;
    if (mode !== 'outgoing' && mode !== 'incoming') return;

    const timer = setTimeout(() => {
      void onTimeout();
    }, CALL_RING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [enabled, mode, onTimeout, sessionId, status]);
}
