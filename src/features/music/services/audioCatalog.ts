import {
  fetchFeaturedMusic,
  fetchMusicByCategory,
  fetchNewMusic,
  fetchRecentMusic,
  fetchSavedMusic,
  fetchTrendingMusic,
  searchMusic,
} from '@/features/music/services/musicData';
import type { AudioCatalogItem, MusicSelection, MusicTrack } from '@/features/music/types';
import type { MusicListTabId } from '@/features/music/constants';
import {
  fetchNewSounds,
  fetchRecentSounds,
  fetchSavedSounds,
  fetchTrendingSounds,
  searchSounds,
} from '@/features/sounds/services/soundData';
import type { Sound } from '@/features/sounds/types';

export function musicTrackToCatalogItem(track: MusicTrack): AudioCatalogItem {
  return { ...track, source: 'music' };
}

export function soundToCatalogItem(sound: Sound): AudioCatalogItem {
  return {
    id: sound.id,
    title: sound.title,
    displayTitle: sound.title,
    artist: sound.author?.username ? `@${sound.author.username}` : 'Kullanıcı sesi',
    album: null,
    categoryId: null,
    categorySlug: null,
    categoryLabel: null,
    coverUrl: sound.coverUrl ?? sound.author?.avatarUrl ?? null,
    audioUrl: sound.audioUrl,
    durationSec: sound.durationSec,
    licenseStatus: 'licensed',
    licenseInfo: null,
    publicationStatus: 'active',
    isTrending: sound.isTrending,
    isFeatured: sound.isPopular,
    isEditorPick: false,
    sortOrder: 0,
    usageCount: sound.usageCount,
    viewCount: sound.listenCount,
    lastUsedAt: sound.lastUsedAt,
    createdAt: sound.createdAt,
    source: 'sound',
  };
}

export function catalogItemToMusicSelection(item: AudioCatalogItem): MusicSelection {
  return {
    source: item.source,
    trackId: item.id,
    displayTitle: item.displayTitle,
    artist: item.artist,
    audioUrl: item.audioUrl,
    durationSec: item.durationSec,
    musicStartSec: 0,
    musicEndSec: item.durationSec,
    musicVolume: 0.8,
    originalAudioVolume: 1,
  };
}

function catalogKey(item: AudioCatalogItem): string {
  return `${item.source}:${item.id}`;
}

function mergeCatalogItems(items: AudioCatalogItem[]): AudioCatalogItem[] {
  const seen = new Set<string>();
  const merged: AudioCatalogItem[] = [];

  for (const item of items) {
    const key = catalogKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Popüler: trend + öne çıkan müzikler ve sesler. */
export async function fetchPopularAudio(limit = 40): Promise<AudioCatalogItem[]> {
  const half = Math.max(12, Math.ceil(limit / 2));
  const [trending, featured, trendingSounds] = await Promise.all([
    fetchTrendingMusic('7d', half),
    fetchFeaturedMusic(half),
    fetchTrendingSounds(half),
  ]);

  return mergeCatalogItems([
    ...trending.map(musicTrackToCatalogItem),
    ...featured.map(musicTrackToCatalogItem),
    ...trendingSounds.map(soundToCatalogItem),
  ]).slice(0, limit);
}

/** Son kullanılan müzik + ses. */
export async function fetchRecentAudio(
  userId: string | null,
  limit = 40,
): Promise<AudioCatalogItem[]> {
  if (!userId) return [];
  const half = Math.max(12, Math.ceil(limit / 2));
  const [music, sounds] = await Promise.all([
    fetchRecentMusic(userId, half),
    fetchRecentSounds(userId, half),
  ]);

  return mergeCatalogItems([
    ...music.map(musicTrackToCatalogItem),
    ...sounds.map(soundToCatalogItem),
  ]).slice(0, limit);
}

/** Kaydedilen müzik + ses. */
export async function fetchSavedAudio(
  userId: string | null,
  limit = 40,
): Promise<AudioCatalogItem[]> {
  if (!userId) return [];
  const half = Math.max(12, Math.ceil(limit / 2));
  const [music, sounds] = await Promise.all([
    fetchSavedMusic(userId, half),
    fetchSavedSounds(userId, half),
  ]);

  return mergeCatalogItems([
    ...music.map(musicTrackToCatalogItem),
    ...sounds.map(soundToCatalogItem),
  ]).slice(0, limit);
}

/** Tüm katalog müzikleri + kullanıcı sesleri. */
export async function fetchAudioCatalog(limit = 40): Promise<AudioCatalogItem[]> {
  const half = Math.max(12, Math.ceil(limit / 2));
  const [featured, newest, trendingSounds, newSounds] = await Promise.all([
    fetchFeaturedMusic(half),
    fetchNewMusic(half),
    fetchTrendingSounds(half),
    fetchNewSounds(half),
  ]);

  return mergeCatalogItems([
    ...featured.map(musicTrackToCatalogItem),
    ...newest.map(musicTrackToCatalogItem),
    ...trendingSounds.map(soundToCatalogItem),
    ...newSounds.map(soundToCatalogItem),
  ]).slice(0, limit);
}

export async function fetchAudioByCategory(categoryId: string, limit = 40): Promise<AudioCatalogItem[]> {
  const tracks = await fetchMusicByCategory(categoryId, limit);
  return tracks.map(musicTrackToCatalogItem);
}

export async function fetchAudioByTab(
  tab: MusicListTabId,
  userId: string | null,
  limit = 40,
): Promise<AudioCatalogItem[]> {
  switch (tab) {
    case 'popular':
      return fetchPopularAudio(limit);
    case 'recent':
      return fetchRecentAudio(userId, limit);
    case 'saved':
      return fetchSavedAudio(userId, limit);
    case 'all':
    default:
      return fetchAudioCatalog(limit);
  }
}

/** Müzik + ses araması. */
export async function searchAudioCatalog(query: string, limit = 40): Promise<AudioCatalogItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const half = Math.max(12, Math.ceil(limit / 2));
  const [music, sounds] = await Promise.all([
    searchMusic(trimmed, half),
    searchSounds(trimmed, half),
  ]);

  return mergeCatalogItems([
    ...music.map(musicTrackToCatalogItem),
    ...sounds.map(soundToCatalogItem),
  ]).slice(0, limit);
}
