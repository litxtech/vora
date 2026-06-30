import {
  getCachedCategories,
  getCachedTracks,
  setCachedCategories,
  setCachedTracks,
} from '@/features/music/services/musicCache';
import type {
  MusicCategory,
  MusicTrack,
  MusicTrendPeriod,
  MusicUsageContentPreview,
  MusicUsageCreatorPreview,
  MusicTrackDiscovery,
} from '@/features/music/types';
import { isMusicTrackPlayable, MUSIC_PENDING_AUDIO_URL } from '@/features/music/constants';
import { resolvePlayableMusicUrl } from '@/features/music/constants/demoTracks';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import type { FeedAuthor } from '@/features/feed/types';
import type { UserRole } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

type TrackRow = {
  id: string;
  title: string;
  display_title: string;
  artist: string;
  album: string | null;
  category_id: string | null;
  cover_url: string | null;
  audio_url: string;
  duration_seconds: number;
  license_status: MusicTrack['licenseStatus'];
  license_info: string | null;
  publication_status: MusicTrack['publicationStatus'];
  is_trending: boolean;
  is_featured: boolean;
  is_editor_pick: boolean;
  sort_order: number;
  usage_count: number;
  view_count: number;
  last_used_at: string | null;
  created_at: string;
  music_categories?: { slug: string; label: string } | { slug: string; label: string }[] | null;
};

function mapTrack(row: TrackRow): MusicTrack {
  const cat = Array.isArray(row.music_categories) ? row.music_categories[0] : row.music_categories;
  return {
    id: row.id,
    title: row.title,
    displayTitle: row.display_title,
    artist: row.artist,
    album: row.album,
    categoryId: row.category_id,
    categorySlug: cat?.slug ?? null,
    categoryLabel: cat?.label ?? null,
    coverUrl: row.cover_url,
    audioUrl: resolvePlayableMusicUrl(row.audio_url, row.id),
    durationSec: Number(row.duration_seconds) || 0,
    licenseStatus: row.license_status,
    licenseInfo: row.license_info,
    publicationStatus: row.publication_status,
    isTrending: row.is_trending,
    isFeatured: row.is_featured,
    isEditorPick: row.is_editor_pick,
    sortOrder: row.sort_order,
    usageCount: row.usage_count,
    viewCount: row.view_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

const TRACK_SELECT = `
  id, title, display_title, artist, album, category_id, cover_url, audio_url,
  duration_seconds, license_status, license_info, publication_status,
  is_trending, is_featured, is_editor_pick, sort_order, usage_count, view_count,
  last_used_at, created_at,
  music_categories (slug, label)
`;

export async function fetchMusicCategories(): Promise<MusicCategory[]> {
  const cached = getCachedCategories();
  if (cached) return cached;

  const { data, error } = await supabase
    .from('music_categories')
    .select('id, slug, label, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  const categories = data.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));

  setCachedCategories(categories);
  return categories;
}

const PLAYABLE_TRACK_FILTER = {
  pendingUrl: MUSIC_PENDING_AUDIO_URL,
} as const;

function filterPlayableTracks(tracks: MusicTrack[]): MusicTrack[] {
  return tracks.filter((track) => isMusicTrackPlayable(track.audioUrl));
}

export async function fetchFeaturedMusic(limit = 30): Promise<MusicTrack[]> {
  const cacheKey = `featured:${limit}`;
  const cached = getCachedTracks(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('music_tracks')
    .select(TRACK_SELECT)
    .eq('publication_status', 'active')
    .eq('license_status', 'licensed')
    .neq('audio_url', PLAYABLE_TRACK_FILTER.pendingUrl)
    .order('is_featured', { ascending: false })
    .order('is_trending', { ascending: false })
    .order('is_editor_pick', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('usage_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    setCachedTracks(cacheKey, []);
    return [];
  }

  const tracks = filterPlayableTracks((data as unknown as TrackRow[]).map(mapTrack));
  const result = tracks.length > 0 ? tracks : [];
  setCachedTracks(cacheKey, result);
  return result;
}

export async function fetchNewMusic(limit = 30): Promise<MusicTrack[]> {
  const cacheKey = `new:${limit}`;
  const cached = getCachedTracks(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('music_tracks')
    .select(TRACK_SELECT)
    .eq('publication_status', 'active')
    .eq('license_status', 'licensed')
    .neq('audio_url', PLAYABLE_TRACK_FILTER.pendingUrl)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  const tracks = filterPlayableTracks((data as unknown as TrackRow[]).map(mapTrack));
  setCachedTracks(cacheKey, tracks);
  return tracks;
}

export async function fetchTrendingMusic(period: MusicTrendPeriod = '7d', limit = 30): Promise<MusicTrack[]> {
  const cacheKey = `trend:${period}:${limit}`;
  const cached = getCachedTracks(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_trending_music_tracks', {
    p_period: period,
    p_limit: limit,
  });

  if (error || !data?.length) {
    const fallback = await fetchFeaturedMusic(limit);
    setCachedTracks(cacheKey, fallback);
    return fallback;
  }

  const tracks = filterPlayableTracks((data as unknown as TrackRow[]).map(mapTrack));
  setCachedTracks(cacheKey, tracks);
  return tracks;
}

export async function fetchRecentMusic(userId: string, limit = 30): Promise<MusicTrack[]> {
  const cacheKey = `recent:${userId}:${limit}`;
  const cached = getCachedTracks(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('user_recent_music')
    .select(`used_at, music_tracks (${TRACK_SELECT})`)
    .eq('user_id', userId)
    .order('used_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const tracks: MusicTrack[] = [];
  for (const row of data) {
    const nested = row.music_tracks as unknown as TrackRow | TrackRow[] | null;
    const trackRow = Array.isArray(nested) ? nested[0] : nested;
    if (trackRow) tracks.push(mapTrack(trackRow));
  }

  setCachedTracks(cacheKey, tracks);
  return tracks;
}

export async function fetchMusicByCategory(categoryId: string, limit = 40): Promise<MusicTrack[]> {
  const cacheKey = `cat:${categoryId}:${limit}`;
  const cached = getCachedTracks(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('music_tracks')
    .select(TRACK_SELECT)
    .eq('publication_status', 'active')
    .eq('license_status', 'licensed')
    .neq('audio_url', PLAYABLE_TRACK_FILTER.pendingUrl)
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  const tracks = filterPlayableTracks((data as unknown as TrackRow[]).map(mapTrack));
  setCachedTracks(cacheKey, tracks);
  return tracks;
}

export async function searchMusic(query: string, limit = 30): Promise<MusicTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc('search_music_tracks', {
    p_query: trimmed,
    p_limit: limit,
  });

  if (error || !data) return [];
  return filterPlayableTracks((data as unknown as TrackRow[]).map(mapTrack));
}

export async function fetchMusicTrackById(id: string): Promise<MusicTrack | null> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select(TRACK_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapTrack(data as unknown as TrackRow);
}

type ProfileSnippet = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
};

function mapProfileAuthor(profile: ProfileSnippet | ProfileSnippet[] | null, fallbackId: string): FeedAuthor {
  const row = Array.isArray(profile) ? profile[0] : profile;
  return {
    id: row?.id ?? fallbackId,
    username: row?.username ?? 'kullanici',
    fullName: row?.full_name ?? null,
    avatarUrl: row?.avatar_url ?? null,
    role: row?.role ?? 'user',
    isVerified: row?.is_verified ?? false,
  };
}

function resolveReelThumbnail(
  video:
    | { mux_playback_id: string | null; thumbnail_url: string | null }
    | { mux_playback_id: string | null; thumbnail_url: string | null }[]
    | null,
): string | null {
  const row = Array.isArray(video) ? video[0] : video;
  if (!row) return null;
  if (row.thumbnail_url) return row.thumbnail_url;
  if (row.mux_playback_id) return getMuxThumbnailUrl(row.mux_playback_id);
  return null;
}

const MUSIC_REEL_PREVIEW_SELECT = `
  id, author_id, caption, view_count, like_count, created_at,
  profiles!reels_author_id_fkey (id, username, full_name, avatar_url, role, is_verified),
  videos (mux_playback_id, thumbnail_url, status)
`;

const MUSIC_POST_PREVIEW_SELECT = `
  id, author_id, content, media_urls, like_count, created_at,
  profiles!posts_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)
`;

function buildCreatorsFromItems(items: MusicUsageContentPreview[]): MusicUsageCreatorPreview[] {
  const map = new Map<string, MusicUsageCreatorPreview>();

  for (const item of items) {
    const existing = map.get(item.author.id);
    if (!existing) {
      map.set(item.author.id, {
        author: item.author,
        usageCount: 1,
        latestAt: item.createdAt,
      });
      continue;
    }

    existing.usageCount += 1;
    if (item.createdAt > existing.latestAt) {
      existing.latestAt = item.createdAt;
    }
  }

  return [...map.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

async function fetchReelPreviewsByMusicTrack(
  trackId: string,
  limit: number,
  cursor: string | null,
): Promise<MusicUsageContentPreview[]> {
  let query = supabase
    .from('reels')
    .select(MUSIC_REEL_PREVIEW_SELECT)
    .eq('music_track_id', trackId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data?.length) return [];

  return data.map((row) => ({
    id: row.id,
    kind: 'reel' as const,
    thumbnailUrl: resolveReelThumbnail(
      row.videos as { mux_playback_id: string | null; thumbnail_url: string | null } | { mux_playback_id: string | null; thumbnail_url: string | null }[] | null,
    ),
    previewUrl: null,
    caption: row.caption ?? '',
    author: mapProfileAuthor(
      row.profiles as ProfileSnippet | ProfileSnippet[] | null,
      row.author_id,
    ),
    viewCount: Number(row.view_count ?? 0),
    likeCount: Number(row.like_count ?? 0),
    createdAt: row.created_at,
  }));
}

async function fetchPostPreviewsByMusicTrack(
  trackId: string,
  limit: number,
  cursor: string | null,
): Promise<MusicUsageContentPreview[]> {
  let query = supabase
    .from('posts')
    .select(MUSIC_POST_PREVIEW_SELECT)
    .eq('music_track_id', trackId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data?.length) return [];

  return data.map((row) => {
    const mediaUrls = (row.media_urls as string[] | null) ?? [];
    const previewUrl = mediaUrls[0] ?? null;

    return {
      id: row.id,
      kind: 'post' as const,
      thumbnailUrl: previewUrl,
      previewUrl,
      caption: row.content ?? '',
      author: mapProfileAuthor(
        row.profiles as ProfileSnippet | ProfileSnippet[] | null,
        row.author_id,
      ),
      viewCount: 0,
      likeCount: Number(row.like_count ?? 0),
      createdAt: row.created_at,
    };
  });
}

export async function fetchMusicUsageContent(
  trackId: string,
  limit = 24,
  cursor: string | null = null,
): Promise<{ items: MusicUsageContentPreview[]; nextCursor: string | null }> {
  const perSource = Math.ceil(limit / 2) + 2;

  const [reels, posts] = await Promise.all([
    fetchReelPreviewsByMusicTrack(trackId, perSource, cursor),
    fetchPostPreviewsByMusicTrack(trackId, perSource, cursor),
  ]);

  const merged = [...reels, ...posts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return {
    items: merged,
    nextCursor: merged.length === limit ? merged[merged.length - 1].createdAt : null,
  };
}

/** @deprecated fetchMusicUsageContent kullan */
export async function fetchReelsByMusicTrack(
  trackId: string,
  limit = 20,
  cursor: string | null = null,
): Promise<{ items: { id: string; caption: string | null; createdAt: string }[]; nextCursor: string | null }> {
  const result = await fetchMusicUsageContent(trackId, limit, cursor);
  return {
    items: result.items
      .filter((item) => item.kind === 'reel')
      .map((item) => ({ id: item.id, caption: item.caption || null, createdAt: item.createdAt })),
    nextCursor: result.nextCursor,
  };
}

export async function fetchMusicTrackDiscovery(
  trackId: string,
  limit = 24,
  cursor: string | null = null,
): Promise<MusicTrackDiscovery> {
  const [track, content] = await Promise.all([
    fetchMusicTrackById(trackId),
    fetchMusicUsageContent(trackId, limit, cursor),
  ]);

  return {
    track,
    creators: buildCreatorsFromItems(content.items),
    items: content.items,
    nextCursor: content.nextCursor,
  };
}
