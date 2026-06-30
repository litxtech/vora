import { useEffect, useState } from 'react';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { captureThumbnail } from '@/features/vora-studio/services/videoThumbnails';

function canThumbnail(uri: string): boolean {
  if (uri.startsWith('file://') || uri.startsWith('content://')) return true;
  return /^https?:\/\//i.test(uri) && isVideoUrl(uri);
}

/** Yerel veya uzak video URI'sinden önizleme karesi üretir. */
export function useLocalVideoThumbnail(uri: string | null | undefined): string | null {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!uri || !canThumbnail(uri)) {
      setThumbnail(null);
      return;
    }

    let cancelled = false;

    void captureThumbnail(uri, 0.5).then((thumb) => {
      if (!cancelled) setThumbnail(thumb);
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return thumbnail;
}
