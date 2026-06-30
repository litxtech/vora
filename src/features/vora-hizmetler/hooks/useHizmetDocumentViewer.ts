import { useCallback, useState } from 'react';
import {
  inferHizmetDocumentMediaType,
  openHizmetPdfInApp,
} from '@/features/vora-hizmetler/services/documentPresentation';

type ImageViewerState = {
  urls: string[];
  startIndex: number;
  label: string;
};

export function useHizmetDocumentViewer() {
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [opening, setOpening] = useState(false);

  const openDocument = useCallback(async (uri: string, label: string) => {
    const mediaType = inferHizmetDocumentMediaType(uri);
    if (mediaType === 'pdf') {
      setOpening(true);
      try {
        await openHizmetPdfInApp(uri);
      } finally {
        setOpening(false);
      }
      return;
    }

    setImageViewer({ urls: [uri], startIndex: 0, label });
  }, []);

  const openImages = useCallback((urls: string[], startIndex = 0, label = 'Görsel') => {
    const filtered = urls.filter(Boolean);
    if (!filtered.length) return;
    setImageViewer({
      urls: filtered,
      startIndex: Math.min(startIndex, filtered.length - 1),
      label,
    });
  }, []);

  const closeViewer = useCallback(() => {
    setImageViewer(null);
  }, []);

  return {
    imageViewer,
    opening,
    openDocument,
    openImages,
    closeViewer,
  };
}
