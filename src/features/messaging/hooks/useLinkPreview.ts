import { useEffect, useState } from 'react';
import { fetchLinkPreview, type LinkPreview } from '../services/linkPreview';

type LinkPreviewState = {
  preview: LinkPreview | null;
  loading: boolean;
};

/** Verilen URL için OG önizlemesini getirir (null url => kapalı). */
export function useLinkPreview(url: string | null): LinkPreviewState {
  const [state, setState] = useState<LinkPreviewState>({ preview: null, loading: false });

  useEffect(() => {
    if (!url) {
      setState({ preview: null, loading: false });
      return;
    }

    let active = true;
    setState({ preview: null, loading: true });

    fetchLinkPreview(url)
      .then((preview) => {
        if (active) setState({ preview, loading: false });
      })
      .catch(() => {
        if (active) setState({ preview: null, loading: false });
      });

    return () => {
      active = false;
    };
  }, [url]);

  return state;
}
