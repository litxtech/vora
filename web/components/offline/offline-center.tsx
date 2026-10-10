'use client';

import { useEffect, useState } from 'react';
import {
  clearAutomatic,
  formatBytes,
  formatClock,
  getSnapshot,
  listQueue,
  retryFailed,
  startOfflineEngine,
  subscribe,
  type OfflineSnapshot,
  type QueueRow,
} from '@/lib/offline/engine';
import { AUTO_TARGET_BYTES } from '@/lib/offline/policy';

export function OfflineCenter() {
  const [state, setState] = useState<OfflineSnapshot>(getSnapshot());
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    startOfflineEngine();
    const stop = subscribe((next) => {
      setState(next);
      void listQueue().then(setQueue);
    });
    void listQueue().then(setQueue);
    return stop;
  }, []);

  const target = Math.min(state.autoTarget, AUTO_TARGET_BYTES);
  return (
    <>
      <h1>Çevrimdışı Kullanım</h1>
      <dl className="vora-offline-stats">
        <div>
          <dt>Cache kullanımı</dt>
          <dd>
            {formatBytes(state.usageBytes)} / {formatBytes(target)}
          </dd>
        </div>
        <div>
          <dt>Medya</dt>
          <dd>{formatBytes(state.mediaBytes + state.videoBytes)}</dd>
        </div>
        <div>
          <dt>Veriler</dt>
          <dd>{formatBytes(state.structuredBytes)}</dd>
        </div>
        <div>
          <dt>Manuel kayıt</dt>
          <dd>{formatBytes(state.manualBytes)}</dd>
        </div>
        <div>
          <dt>Offline bekleyen işlemler</dt>
          <dd>{state.pendingCount}</dd>
        </div>
        <div>
          <dt>Son senkronizasyon</dt>
          <dd>{state.lastSyncAt ? formatClock(state.lastSyncAt) : 'Henüz yok'}</dd>
        </div>
      </dl>
      {state.quotaBytes ? <p className="muted">Tarayıcı kotası: {formatBytes(state.quotaBytes)}. Kalıcı depolama: {state.persisted ? 'istendi' : 'isteğe bağlı'}.</p> : null}
      {state.lowStorage ? <p>Çevrimdışı içerikler cihazında fazla yer kaplıyor.</p> : null}
      <div className="row-actions" id="temizle">
        <button className="btn ghost" type="button" onClick={() => void clearAutomatic('video')}>Eski videolar</button>
        <button className="btn ghost" type="button" onClick={() => void clearAutomatic('image')}>Eski görseller</button>
        <button className="btn ghost" type="button" onClick={() => void clearAutomatic('feed')}>Eski feed</button>
        <button className="btn" type="button" onClick={() => void clearAutomatic('all')}>Önbelleği Temizle</button>
      </div>
      <p className="muted">Manuel çevrimdışı kayıtlar bu temizlikten etkilenmez.</p>
      <button className="btn ghost" type="button" onClick={() => setOpen((value) => !value)}>
        Bekleyen İşlemleri Gör
      </button>
      {open ? (
        <ul>
          {queue.length === 0 ? <li>Bekleyen işlem yok.</li> : null}
          {queue.map((item) => (
            <li key={item.id}>
              {item.type} · {item.status}
              {item.lastError ? ` · ${item.lastError}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      {queue.some((item) => item.status === 'failed') ? (
        <button className="btn" type="button" onClick={() => void retryFailed()}>
          Başarısızları yeniden dene
        </button>
      ) : null}
    </>
  );
}
