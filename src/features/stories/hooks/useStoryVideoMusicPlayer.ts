import { useEffect } from 'react';
import type { VideoPlayer } from 'expo-video';
import type { MusicPlaybackConfig } from '@/features/music/types';
import {
  attachReelMusic,
  detachReelMusicIfOwner,
  prefetchReelMusic,
} from '@/features/music/services/reelMusicSync';

type UseStoryVideoMusicPlayerInput = {
  itemId: string;
  videoPlayer: VideoPlayer;
  config: MusicPlaybackConfig | null | undefined;
  active: boolean;
};

/** Hikâye videosu + müzik — reel havuzu ve anlık senkron. */
export function useStoryVideoMusicPlayer({
  itemId,
  videoPlayer,
  config,
  active,
}: UseStoryVideoMusicPlayerInput): void {
  useEffect(() => {
    if (config) prefetchReelMusic(config);
  }, [config]);

  useEffect(() => {
    if (!active || !config?.audioUrl) {
      detachReelMusicIfOwner(itemId);
      return;
    }

    void attachReelMusic(itemId, videoPlayer, config);

    return () => {
      detachReelMusicIfOwner(itemId);
    };
  }, [active, config, itemId, videoPlayer]);
}
