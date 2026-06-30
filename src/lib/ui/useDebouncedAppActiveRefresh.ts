import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Ön plana dönüşte refresh'i tek isteğe indirir (AppState dalgalanması / hızlı geçişler). */
export function useDebouncedAppActiveRefresh(
  refresh: () => void | Promise<void>,
  debounceMs = 600,
): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void refreshRef.current();
      }, debounceMs);
    };

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') schedule();
    });

    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [debounceMs]);
}
