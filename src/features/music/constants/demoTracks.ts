import type { MusicTrack } from '@/features/music/types';

/**
 * Pixabay CDN doğrudan indirmeyi 403 ile engelliyor — örnek parçalar bu URL'lerle değiştirilir.
 * SoundHelix demo MP3'leri hotlink'e izin verir (test / yedek).
 */
export const WORKING_DEMO_AUDIO_URLS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
] as const;

const BROKEN_HOSTS = ['cdn.pixabay.com', 'pixabay.com'] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h + id.charCodeAt(i)) % WORKING_DEMO_AUDIO_URLS.length;
  }
  return h;
}

/** Eski / kırık örnek URL'leri çalışan demo adreslerle değiştirir. */
export function resolvePlayableMusicUrl(audioUrl: string, trackId = ''): string {
  if (!audioUrl) return audioUrl;
  const lower = audioUrl.toLowerCase();
  if (BROKEN_HOSTS.some((host) => lower.includes(host))) {
    const idx = trackId ? hashId(trackId) : 0;
    return WORKING_DEMO_AUDIO_URLS[idx] ?? WORKING_DEMO_AUDIO_URLS[0];
  }
  return audioUrl;
}

export const LOCAL_DEMO_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'demo_pulse_rise',
    title: 'Pulse Rise',
    displayTitle: 'Pulse Rise (Demo)',
    artist: 'Vora Music',
    album: null,
    categoryId: null,
    categorySlug: 'trend',
    categoryLabel: 'Trend',
    coverUrl: null,
    audioUrl: WORKING_DEMO_AUDIO_URLS[0],
    durationSec: 348,
    licenseStatus: 'licensed',
    licenseInfo: 'Demo — SoundHelix',
    publicationStatus: 'active',
    isTrending: true,
    isFeatured: true,
    isEditorPick: false,
    sortOrder: 1,
    usageCount: 0,
    viewCount: 0,
    lastUsedAt: null,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'demo_sunny_walk',
    title: 'Sunny Walk',
    displayTitle: 'Sunny Walk (Demo)',
    artist: 'Vora Music',
    album: null,
    categoryId: null,
    categorySlug: 'vlog',
    categoryLabel: 'Vlog',
    coverUrl: null,
    audioUrl: WORKING_DEMO_AUDIO_URLS[1],
    durationSec: 420,
    licenseStatus: 'licensed',
    licenseInfo: 'Demo — SoundHelix',
    publicationStatus: 'active',
    isTrending: false,
    isFeatured: true,
    isEditorPick: false,
    sortOrder: 2,
    usageCount: 0,
    viewCount: 0,
    lastUsedAt: null,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'demo_calm_strings',
    title: 'Calm Strings',
    displayTitle: 'Calm Strings (Demo)',
    artist: 'Vora Music',
    album: null,
    categoryId: null,
    categorySlug: 'instrumental',
    categoryLabel: 'Enstrümantal',
    coverUrl: null,
    audioUrl: WORKING_DEMO_AUDIO_URLS[2],
    durationSec: 380,
    licenseStatus: 'licensed',
    licenseInfo: 'Demo — SoundHelix',
    publicationStatus: 'active',
    isTrending: false,
    isFeatured: false,
    isEditorPick: true,
    sortOrder: 3,
    usageCount: 0,
    viewCount: 0,
    lastUsedAt: null,
    createdAt: new Date(0).toISOString(),
  },
];
