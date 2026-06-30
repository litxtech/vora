import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { evaluateSystemGate } from '@/features/system-gate/services/systemGateData';
import type { SystemGateState } from '@/features/system-gate/types';

export function useSystemGate(): SystemGateState & { refresh: () => Promise<void> } {
  const [gate, setGate] = useState<SystemGateState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    const next = await evaluateSystemGate();
    setGate(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { ...gate, refresh };
}
