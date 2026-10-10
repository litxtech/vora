'use client';

import Link from 'next/link';
import { useState } from 'react';
import { searchLocal } from '@/lib/offline/engine';

const KIND_LABEL: Record<string, string> = {
  city: 'Şehir',
  blog: 'Blog',
  event: 'Etkinlik',
  post: 'Paylaşım',
  feed: 'Paylaşım',
  profile: 'Profil',
  explore: 'Keşfet',
  page: 'Sayfa',
  story: 'Story',
};

export function OfflineSearchForm({ initial }: { initial: string }) {
  const [hits, setHits] = useState<{ href: string; title: string; kind: string }[]>([]);
  const [offline, setOffline] = useState(false);

  return (
    <>
      <form
        action="/search"
        onSubmit={(event) => {
          if (navigator.onLine) return;
          event.preventDefault();
          const query = String(new FormData(event.currentTarget).get('q') ?? '');
          setOffline(true);
          void searchLocal(query).then(setHits);
        }}
      >
        <label htmlFor="q">Ara</label>
        <input id="q" name="q" defaultValue={initial} />
        <button className="btn" type="submit">
          Ara
        </button>
      </form>
      {offline ? (
        <div>
          <p>Sonuçlar çevrimdışı önbellekten.</p>
          <ul>
            {hits.length === 0 ? <li>Cihazında bu aramayla eşleşen kayıt yok.</li> : null}
            {hits.map((hit) => (
              <li key={hit.href}>
                <Link href={hit.href}>{hit.title}</Link> <span className="muted">· {KIND_LABEL[hit.kind] ?? hit.kind} · çevrimdışı</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
