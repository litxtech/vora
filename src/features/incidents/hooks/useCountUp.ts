import { useEffect, useState } from 'react';

export function useCountUp(target: number, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    const steps = 32;
    const stepMs = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const eased = 1 - (1 - step / steps) ** 2;
      setValue(Math.min(target, Math.round(target * eased)));
      if (step >= steps) clearInterval(timer);
    }, stepMs);

    return () => clearInterval(timer);
  }, [target, durationMs]);

  return value;
}
