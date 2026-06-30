import type { MusicCategoryId } from '@/features/vora-studio/constants';
import type { StudioMusicTrack } from '@/features/vora-studio/types';
import { WORKING_DEMO_AUDIO_URLS } from '@/features/music/constants/demoTracks';
import { fetchMusicTrackById } from '@/features/music/services/musicData';
import type { MusicTrack } from '@/features/music/types';

/** Supabase erişilemezse yerel yedek — çalışan HTTPS demo URL'leri */
export const STUDIO_MUSIC_LIBRARY: StudioMusicTrack[] = [
  {
    id: 'trend_pulse',
    title: 'Pulse Rise',
    category: 'trend',
    uri: WORKING_DEMO_AUDIO_URLS[0],
    durationSec: 348,
    license: 'Demo — SoundHelix',
  },
  {
    id: 'news_breaking',
    title: 'Breaking News',
    category: 'news',
    uri: WORKING_DEMO_AUDIO_URLS[1],
    durationSec: 420,
    license: 'Demo — SoundHelix',
  },
  {
    id: 'vlog_sunny',
    title: 'Sunny Walk',
    category: 'vlog',
    uri: WORKING_DEMO_AUDIO_URLS[2],
    durationSec: 380,
    license: 'Demo — SoundHelix',
  },
  {
    id: 'karadeniz_horon',
    title: 'Horon Ritmi',
    category: 'karadeniz',
    uri: WORKING_DEMO_AUDIO_URLS[3],
    durationSec: 360,
    license: 'Demo — SoundHelix',
  },
  {
    id: 'inst_calm',
    title: 'Calm Strings',
    category: 'instrumental',
    uri: WORKING_DEMO_AUDIO_URLS[4],
    durationSec: 400,
    license: 'Demo — SoundHelix',
  },
];

function toStudioTrack(track: MusicTrack): StudioMusicTrack {
  return {
    id: track.id,
    title: track.displayTitle,
    category: (track.categorySlug ?? 'trend') as MusicCategoryId,
    uri: track.audioUrl,
    durationSec: track.durationSec,
    license: track.licenseInfo ?? 'Licensed',
  };
}

export function getMusicByCategory(category: MusicCategoryId): StudioMusicTrack[] {
  return STUDIO_MUSIC_LIBRARY.filter((track) => track.category === category);
}

export async function getMusicTrackById(id: string): Promise<StudioMusicTrack | undefined> {
  const remote = await fetchMusicTrackById(id);
  if (remote) return toStudioTrack(remote);
  return STUDIO_MUSIC_LIBRARY.find((track) => track.id === id);
}

export function getMusicTrackByIdSync(id: string): StudioMusicTrack | undefined {
  return STUDIO_MUSIC_LIBRARY.find((track) => track.id === id);
}
