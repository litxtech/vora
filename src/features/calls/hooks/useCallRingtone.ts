import { useEffect } from 'react';
import {
  startCallRingtone,
  stopCallRingtone,
} from '@/features/calls/services/callRingtonePlayer';
import type { CallScreenMode, CallStatus } from '@/features/calls/types';

type UseCallRingtoneOptions = {
  mode: CallScreenMode;
  status: CallStatus | undefined;
  enabled: boolean;
};

export function useCallRingtone({ mode, status, enabled }: UseCallRingtoneOptions) {
  useEffect(() => {
    if (!enabled || status !== 'ringing') {
      void stopCallRingtone();
      return;
    }

    if (mode === 'incoming') {
      void startCallRingtone('incoming');
    } else if (mode === 'outgoing') {
      void startCallRingtone('outgoing');
    } else {
      void stopCallRingtone();
      return;
    }

    return () => {
      void stopCallRingtone();
    };
  }, [enabled, mode, status]);
}
