import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';

const thumbCache = new Map<string, string | null>();

/** Yalnızca yerel URI — uzak HTTPS’te native frame extract Android sohbet açılışını kilitliyor. */
function isLocalMediaUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

/**
 * Yerel video URI’sinden önizleme karesi.
 * Uzak URL’ler için null döner (Mux poster / statik fallback kullanılır).
 */
export function useLocalVideoThumbnail(uri: string | null | undefined): string | null {
  const [thumbnail, setThumbnail] = useState<string | null>(() => {
    if (!uri || !isLocalMediaUri(uri)) return null;
    return thumbCache.get(uri) ?? null;
  });

  useEffect(() => {
    if (!uri || !isLocalMediaUri(uri)) {
      setThumbnail(null);
      return;
    }

    const cached = thumbCache.get(uri);
    if (cached !== undefined) {
      setThumbnail(cached);
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void captureThumbnail(uri, 0.5).then((thumb) => {
        thumbCache.set(uri, thumb);
        if (!cancelled) setThumbnail(thumb);
      });
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [uri]);

  return thumbnail;
}
