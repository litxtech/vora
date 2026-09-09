import { useEffect, useState } from 'react';
import { fetchLinkPreview, type LinkPreview } from '../services/linkPreview';
import { isPreviewableUrl } from '../utils/textSegments';

type LinkPreviewState = {
  preview: LinkPreview | null;
  loading: boolean;
};

const PREVIEW_DEBOUNCE_MS = 450;

/** Verilen URL için OG önizlemesini getirir (null/yarım url => kapalı). */
export function useLinkPreview(url: string | null): LinkPreviewState {
  const [state, setState] = useState<LinkPreviewState>({ preview: null, loading: false });

  useEffect(() => {
    if (!url || !isPreviewableUrl(url)) {
      setState({ preview: null, loading: false });
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setState((prev) => ({ ...prev, loading: true }));

      fetchLinkPreview(url)
        .then((preview) => {
          if (active) setState({ preview, loading: false });
        })
        .catch(() => {
          if (active) setState({ preview: null, loading: false });
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url]);

  return state;
}
