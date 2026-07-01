import { resolvePlayableMusicUrl } from '@/features/music/constants/demoTracks';
import type { MusicPlaybackConfig } from '@/features/music/types';
import type { StoryMusicManifest } from '@/features/stories/utils/storyManifest';

export function mapStoryMusicPlayback(music: StoryMusicManifest | null | undefined): MusicPlaybackConfig | null {
  if (!music?.audioUrl) return null;

  return {
    audioUrl: resolvePlayableMusicUrl(music.audioUrl, music.trackId),
    musicStartSec: music.musicStartSec,
    musicEndSec: music.musicEndSec,
    musicVolume: music.musicVolume,
    originalAudioVolume: music.originalAudioVolume,
  };
}
