'use client';

import { useState } from 'react';
import { createPost } from '@/lib/app-actions';
import { enqueueAction } from '@/lib/offline/engine';

type City = { id: string; name: string };

export function OfflineCompose({ cities, defaultRegion }: { cities: City[]; defaultRegion: string }) {
  const [note, setNote] = useState('');

  return (
    <form
      className="stack auth-card"
      action={createPost}
      onSubmit={(event) => {
        const form = event.currentTarget;
        const data = new FormData(form);
        const file = data.get('media');
        const hasFile = file instanceof File && file.size > 0;
        if (navigator.onLine && !hasFile) return;
        event.preventDefault();
        const content = String(data.get('content') ?? '').trim();
        const regionId = String(data.get('region_id') ?? '').trim();
        const audience = String(data.get('audience') ?? 'public');
        const type = hasFile && file instanceof File && file.type.startsWith('video/') ? 'video' : hasFile ? 'photo' : 'post';
        void enqueueAction({
          type,
          payload: {
            content,
            regionId,
            audience,
            filename: file instanceof File ? file.name : undefined,
            clientNonce: crypto.randomUUID(),
          },
          file: hasFile && file instanceof File ? file : undefined,
        }).then((result) => setNote(result.message));
      }}
    >
      {note ? <p className={note.includes('beklen') || note.includes('kaydedilecek') ? 'form-ok' : 'form-error'}>{note}</p> : null}
      <label htmlFor="content">Ne paylaşmak istiyorsun?</label>
      <textarea id="content" name="content" required maxLength={4000} />
      <label htmlFor="region_id">Şehir</label>
      <select id="region_id" name="region_id" defaultValue={defaultRegion} required>
        <option value="">Şehir seç</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
      <label htmlFor="audience">Kimler görsün</label>
      <select id="audience" name="audience" defaultValue="public">
        <option value="public">Herkes</option>
        <option value="friends">Arkadaşlar</option>
      </select>
      <label htmlFor="media">Fotoğraf veya video</label>
      <input id="media" name="media" type="file" accept="image/*,video/*" />
      <button className="btn" type="submit">
        Paylaş
      </button>
    </form>
  );
}
