import { useEffect, useState } from 'react';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';

/** Konum, realtime ve tam profil — ana UI çizildikten sonra açılır. */
export function useAndroidHeavyBootGate(): boolean {
  const bootDelayMs = getHeavyFeatureBootDelayMs('proximity');
  const [ready, setReady] = useState(() => bootDelayMs === 0);

  useEffect(() => {
    if (bootDelayMs === 0) return;

    const timer = setTimeout(() => setReady(true), bootDelayMs);
    return () => clearTimeout(timer);
  }, [bootDelayMs]);

  return ready;
}
