'use client';

import { useEffect, useState } from 'react';
import { formatUpdated, lookupPage, pinCurrent, subscribe } from '@/lib/offline/engine';
import type { ContentKind } from '@/lib/offline/policy';

export function OfflineTools({ kind, title, href }: { kind: ContentKind; title: string; href: string }) {
  const [stamp, setStamp] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = () => {
      void lookupPage(href.split('?')[0] || href).then((row) => {
        if (alive && row) setStamp(formatUpdated(row.updatedAt));
      });
    };
    read();
    const stop = subscribe(() => {
      setOffline(!navigator.onLine);
      read();
    });
    setOffline(!navigator.onLine);
    return () => {
      alive = false;
      stop();
    };
  }, [href]);

  return (
    <p className="vora-offline-tools">
      {stamp ? <span>{stamp}</span> : null}
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          void pinCurrent(kind, title, href).then(setNote);
        }}
      >
        Çevrimdışı kaydet
      </button>
      {note ? <span>{note}</span> : null}
      {kind === 'event' && offline ? (
        <span>Katıl, satın al ve rezervasyon bağlantı gerektirir. Çevrimdışıyken kesinleşmez.</span>
      ) : null}
    </p>
  );
}
