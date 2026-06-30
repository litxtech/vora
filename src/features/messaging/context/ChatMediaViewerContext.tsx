import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { resolvePlaybackUrl } from '@/lib/media/resolvePlaybackUrl';
import { ChatMediaViewer } from '../components/ChatMediaViewer';

type OpenMediaOptions = {
  isVideo?: boolean;
};

type ViewerState = {
  uri: string;
  isVideo: boolean;
};

type ChatMediaViewerContextValue = {
  openMedia: (uri: string, options?: OpenMediaOptions) => void;
  isViewerOpen: boolean;
};

const ChatMediaViewerContext = createContext<ChatMediaViewerContextValue | null>(null);

export function ChatMediaViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const openMedia = useCallback((next: string, options?: OpenMediaOptions) => {
    const trimmed = next.trim();
    if (!trimmed) return;

    const isVideo = options?.isVideo ?? isVideoUrl(trimmed);
    if (isVideo) {
      const resolved = resolvePlaybackUrl(trimmed) ?? trimmed;
      if (!resolved) return;
      setViewer({ uri: resolved, isVideo: true });
      return;
    }

    setViewer({ uri: trimmed, isVideo: false });
  }, []);

  const closeMedia = useCallback(() => {
    setViewer(null);
  }, []);

  const value = useMemo(
    () => ({ openMedia, isViewerOpen: viewer !== null }),
    [openMedia, viewer],
  );

  return (
    <ChatMediaViewerContext.Provider value={value}>
      {children}
      {viewer ? (
        <ChatMediaViewer uri={viewer.uri} isVideo={viewer.isVideo} onClose={closeMedia} />
      ) : null}
    </ChatMediaViewerContext.Provider>
  );
}

export function useChatMediaViewer() {
  const ctx = useContext(ChatMediaViewerContext);
  if (!ctx) {
    throw new Error('useChatMediaViewer must be used within ChatMediaViewerProvider');
  }
  return ctx;
}
