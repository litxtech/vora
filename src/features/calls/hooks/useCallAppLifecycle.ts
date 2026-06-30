import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { activateCallAudioMode } from '@/features/calls/services/callAudioMode';
import { useCallStore } from '@/features/calls/store/callStore';

/** Arka plana alınınca görüşme sesinin devam etmesini destekle. */
export function useCallAppLifecycle() {
  const isJoined = useCallStore((s) => s.isJoined);
  const sessionStatus = useCallStore((s) => s.session?.status);

  useEffect(() => {
    if (!isJoined || sessionStatus !== 'accepted') return undefined;

    const syncAudio = (state: AppStateStatus) => {
      if (state === 'active' || state === 'background') {
        void activateCallAudioMode();
      }
    };

    syncAudio(AppState.currentState);
    const sub = AppState.addEventListener('change', syncAudio);
    return () => sub.remove();
  }, [isJoined, sessionStatus]);
}
