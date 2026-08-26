import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useAppForeground(): boolean {
  const [foreground, setForeground] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setForeground(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return foreground;
}
