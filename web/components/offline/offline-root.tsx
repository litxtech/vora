'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSnapshot, startOfflineEngine, subscribe, type OfflineSnapshot } from '@/lib/offline/engine';

export function OfflineRoot() {
  const [state, setState] = useState<OfflineSnapshot | null>(null);

  useEffect(() => {
    startOfflineEngine();
    return subscribe(setState);
  }, []);

  const current = state ?? getSnapshot();
  const text = current.status === 'ONLINE'
    ? (current.lowStorage ? 'Çevrimdışı içerikler cihazında fazla yer kaplıyor.' : '')
    : current.message;
  return (
    <div id="vora-offline-root">
      {text ? (
        <div className="vora-offline-bar" role="status" aria-live="polite" data-state={current.lowStorage && current.status === 'ONLINE' ? 'warning' : current.status.toLowerCase()}>
          <span>{text}</span>
          {current.lowStorage ? <Link href="/app/offline">Yer aç</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
