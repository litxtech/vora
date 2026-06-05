import { useEffect, useState } from 'react';

export function useCallDuration(startedAt: string | null, active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) {
      setSeconds(0);
      return;
    }

    const startMs = new Date(startedAt).getTime();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [active, startedAt]);

  return seconds;
}
