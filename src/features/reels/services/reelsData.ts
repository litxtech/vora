import { DEMO_REELS } from '@/features/reels/constants';
import { demoArrayFallback, isDemoDataEnabled } from '@/lib/demo/demoData';
import { sortReelsWithPins } from '@/features/reels/services/reelPinning';
import { AUTHOR_PROFILE_FIELDS } from '@/features/platform-charm/constants';
import { resolveAuthorGender, resolveHiddenBadges, resolvePlatformCharm } from '@/features/platform-charm/utils';
import { resolvePioneer } from '@/features/pioneer/utils';
import { resolvePlatformSupporter } from '@/features/platform-support/utils/resolvePlatformSupporter';
import type { ReelItem } from '@/features/reels/types';
import type { FeedAuthor } from '@/features/feed/types';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { fetchHiddenAuthors, shouldHideAuthor } from '@/features/moderation/services/relationships';
import { enrichFeedAuthorsInItems } from '@/features/profile/services/businessIdentity';
import { applyBusinessFollowStateToFeedItems } from '@/features/profile/services/businessFollow';
import { supabase } from '@/lib/supabase/client';
import type { MusicAttribution, MusicPlaybackConfig } from '@/features/music/types';
import { isMusicTrackPlayable } from '@/features/music/constants';
import { resolvePlayableMusicUrl } from '@/features/music/constants/demoTracks';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';
import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';

const PAGE_SIZE = 10;

const REEL_SELECT = `
  id, author_id, region_id, caption, like_count, comment_count, view_count, share_count, save_count, completion_rate, is_sensitive, created_at,
  is_pinned, pin_priority, pinned_at,
  music_track_id, music_start_sec, music_end_sec, music_volume, original_audio_volume, edit_manifest,
  music_tracks (id, display_title, artist, audio_url, duration_seconds),
  profiles!reels_author_id_fkey (${AUTHOR_PROFILE_FIELDS}),
  videos (mux_playback_id, thumbnail_url, status)
`;

function mapMusic(row: {
  music_track_id: string | null;
  music_tracks:
    | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }
    | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }[]
    | null;
}): MusicAttribution | null {
  if (!row.music_track_id) return null;
  const track = Array.isArray(row.music_tracks) ? row.music_tracks[0] : row.music_tracks;
  if (!track) return null;
  return {
    trackId: track.id,
    displayTitle: track.display_title,
    artist: track.artist,
  };
}

function mapMusicPlayback(row: {
  music_track_id: string | null;
  music_start_sec: number | null;
  music_end_sec: number | null;
  music_volume: number | null;
  original_audio_volume: number | null;
  music_tracks:
    | { id: string; audio_url?: string; duration_seconds?: number }
    | { id: string; audio_url?: string; duration_seconds?: number }[]
    | null;
}): MusicPlaybackConfig | null {
  if (!row.music_track_id) return null;
  const track = Array.isArray(row.music_tracks) ? row.music_tracks[0] : row.music_tracks;
  if (!track?.audio_url || !isMusicTrackPlayable(track.audio_url)) return null;

  return {
    audioUrl: resolvePlayableMusicUrl(track.audio_url, track.id),
    musicStartSec: Number(row.music_start_sec ?? 0),
    musicEndSec: Number(row.music_end_sec ?? track.duration_seconds ?? 0) || Number(track.duration_seconds ?? 30),
    musicVolume: Number(row.music_volume ?? 0.8),
    originalAudioVolume: Number(row.original_audio_volume ?? 0),
  };
}

function mapEditManifest(raw: unknown): PublishedEditManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const manifest = raw as PublishedEditManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.textOverlays)) return null;
  return manifest;
}

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  is_platform_charm?: boolean;
  is_pioneer?: boolean;
  is_platform_supporter?: boolean;
  gender?: GenderId | null;
  account_status?: FeedAuthor['accountStatus'];
  hidden_badges?: string[] | null;
};

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  const accountStatus = profile?.account_status ?? 'active';
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: sanitizeDisplayName(profile?.full_name ?? null, profile?.username ?? null, accountStatus),
    avatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, accountStatus),
    role: profile?.role ?? 'user',
    isVerified: isHiddenPublicAccount(accountStatus) ? false : (profile?.is_verified ?? false),
    isPlatformCharm: resolvePlatformCharm(profile?.is_platform_charm, accountStatus),
    isPioneer: resolvePioneer(profile?.is_pioneer, accountStatus),
    isPlatformSupporter: resolvePlatformSupporter(profile?.is_platform_supporter, accountStatus),
    hiddenBadges: resolveHiddenBadges(profile?.hidden_badges, accountStatus),
    gender: resolveAuthorGender(profile?.gender, accountStatus),
    accountStatus,
  };
}

export async function fetchReels(
  regionId: string | null,
  userId: string | null,
  cursor: string | null,
): Promise<{ items: ReelItem[]; nextCursor: string | null }> {
  let query = supabase
    .from('reels')
    .select(REEL_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (regionId) query = query.eq('region_id', regionId);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data?.length) {
    return { items: demoArrayFallback(DEMO_REELS), nextCursor: null };
  }

  type ReelRow = {
    id: string;
    author_id: string;
    region_id: string;
    caption: string | null;
    like_count: number;
    comment_count: number;
    view_count: number;
    share_count: number;
    save_count: number;
    completion_rate: number;
    is_sensitive: boolean;
    is_pinned: boolean;
    pin_priority: number;
    pinned_at: string | null;
    music_track_id: string | null;
    music_start_sec: number | null;
    music_end_sec: number | null;
    music_volume: number | null;
    original_audio_volume: number | null;
    edit_manifest: unknown;
    music_tracks:
      | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }
      | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }[]
      | null;
    created_at: string;
    profiles: ProfileRow | ProfileRow[] | null;
    videos: { mux_playback_id: string | null; thumbnail_url: string | null; status: string } | { mux_playback_id: string | null; thumbnail_url: string | null; status: string }[] | null;
  };

  const rows = data as unknown as ReelRow[];
  const reelIds = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];

  const [likedRes, savedRes, followingRes, hidden] = await Promise.all([
    userId
      ? supabase.from('reel_likes').select('reel_id').eq('user_id', userId).in('reel_id', reelIds)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('reel_saves').select('reel_id').eq('user_id', userId).in('reel_id', reelIds)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
    fetchHiddenAuthors(userId),
  ]);

  const liked = new Set((likedRes.data ?? []).map((r) => r.reel_id));
  const saved = new Set((savedRes.data ?? []).map((r) => r.reel_id));
  const following = new Set((followingRes.data ?? []).map((r) => r.following_id));

  const sortable: (ReelItem & { isPinned?: boolean; pinPriority?: number; pinnedAt?: string | null })[] = [];
  for (const row of rows) {
    if (shouldHideAuthor(row.author_id, hidden)) continue;

    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;
    if (video?.status !== 'ready' || !video?.mux_playback_id) continue;

    sortable.push({
      id: row.id,
      playbackId: video.mux_playback_id,
      thumbnailUrl: video.thumbnail_url ?? getMuxThumbnailUrl(video.mux_playback_id),
      caption: row.caption ?? '',
      author: toAuthor(profile, row.author_id),
      regionId: row.region_id,
      district: null,
      locationLabel: null,
      category: null,
      likeCount: row.like_count,
      viewCount: row.view_count,
      shareCount: row.share_count ?? 0,
      saveCount: row.save_count ?? 0,
      completionRate: Number(row.completion_rate ?? 0),
      commentCount: row.comment_count ?? 0,
      createdAt: row.created_at,
      isLiked: liked.has(row.id),
      isSaved: saved.has(row.id),
      isFollowing: following.has(row.author_id),
      isSensitive: row.is_sensitive ?? false,
      isPinned: row.is_pinned,
      pinPriority: row.pin_priority,
      pinnedAt: row.pinned_at,
      music: mapMusic(row),
      musicPlayback: mapMusicPlayback(row),
      editManifest: mapEditManifest(row.edit_manifest),
    });
  }

  if (sortable.length === 0) return { items: demoArrayFallback(DEMO_REELS), nextCursor: null };

  const items = sortReelsWithPins(sortable);
  const enriched = await enrichFeedAuthorsInItems(items);
  const withFollowState = await applyBusinessFollowStateToFeedItems(enriched, userId);
  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null;
  return { items: withFollowState, nextCursor };
}

type ReelRow = {
  id: string;
  author_id: string;
  region_id: string;
  caption: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  share_count: number;
  save_count: number;
  completion_rate: number;
  is_sensitive: boolean;
  created_at: string;
  music_track_id: string | null;
  music_start_sec: number | null;
  music_end_sec: number | null;
  music_volume: number | null;
  original_audio_volume: number | null;
  edit_manifest: unknown;
  music_tracks:
    | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }
    | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }[]
    | null;
  profiles: ProfileRow | ProfileRow[] | null;
  videos:
    | { mux_playback_id: string | null; thumbnail_url: string | null; status: string }
    | { mux_playback_id: string | null; thumbnail_url: string | null; status: string }[]
    | null;
};

function mapReelRow(
  row: ReelRow,
  state: { liked: Set<string>; saved: Set<string>; following: Set<string> },
): ReelItem | null {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;
  if (video?.status !== 'ready' || !video?.mux_playback_id) return null;

  return {
    id: row.id,
    playbackId: video.mux_playback_id,
    thumbnailUrl: video.thumbnail_url ?? getMuxThumbnailUrl(video.mux_playback_id),
    caption: row.caption ?? '',
    author: toAuthor(profile, row.author_id),
    regionId: row.region_id,
    district: null,
    locationLabel: null,
    category: null,
    likeCount: row.like_count,
    viewCount: row.view_count,
    shareCount: row.share_count ?? 0,
    saveCount: row.save_count ?? 0,
    completionRate: Number(row.completion_rate ?? 0),
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at,
    isLiked: state.liked.has(row.id),
    isSaved: state.saved.has(row.id),
    isFollowing: state.following.has(row.author_id),
    isSensitive: row.is_sensitive ?? false,
    music: mapMusic(row),
    musicPlayback: mapMusicPlayback(row),
    editManifest: mapEditManifest(row.edit_manifest),
  };
}

export async function fetchReelByPlaybackId(
  playbackId: string,
  userId: string | null,
): Promise<ReelItem | null> {
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id')
    .eq('mux_playback_id', playbackId)
    .maybeSingle();

  if (videoError || !video?.id) return null;

  const { data, error } = await supabase
    .from('reels')
    .select(REEL_SELECT)
    .eq('video_id', video.id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ReelRow;
  const [likedRes, savedRes, followingRes] = await Promise.all([
    userId
      ? supabase.from('reel_likes').select('reel_id').eq('user_id', userId).eq('reel_id', row.id)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('reel_saves').select('reel_id').eq('user_id', userId).eq('reel_id', row.id)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('follows').select('following_id').eq('follower_id', userId).eq('following_id', row.author_id)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
  ]);

  return mapReelRow(row, {
    liked: new Set((likedRes.data ?? []).map((entry) => entry.reel_id)),
    saved: new Set((savedRes.data ?? []).map((entry) => entry.reel_id)),
    following: new Set((followingRes.data ?? []).map((entry) => entry.following_id)),
  });
}

export async function fetchReelById(reelId: string, userId: string | null): Promise<ReelItem | null> {
  if (reelId.startsWith('demo-')) {
    return isDemoDataEnabled() ? (DEMO_REELS.find((reel) => reel.id === reelId) ?? null) : null;
  }

  const { data, error } = await supabase
    .from('reels')
    .select(
      `id, author_id, region_id, caption, like_count, comment_count, view_count, share_count, save_count, completion_rate, is_sensitive, created_at,
       profiles!reels_author_id_fkey (${AUTHOR_PROFILE_FIELDS}),
       videos (mux_playback_id, thumbnail_url, status)`,
    )
    .eq('id', reelId)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ReelRow;
  const [likedRes, savedRes, followingRes] = await Promise.all([
    userId
      ? supabase.from('reel_likes').select('reel_id').eq('user_id', userId).eq('reel_id', reelId)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('reel_saves').select('reel_id').eq('user_id', userId).eq('reel_id', reelId)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('follows').select('following_id').eq('follower_id', userId).eq('following_id', row.author_id)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
  ]);

  return mapReelRow(row, {
    liked: new Set((likedRes.data ?? []).map((entry) => entry.reel_id)),
    saved: new Set((savedRes.data ?? []).map((entry) => entry.reel_id)),
    following: new Set((followingRes.data ?? []).map((entry) => entry.following_id)),
  });
}

export async function recordReelView(reelId: string): Promise<boolean> {
  if (reelId.startsWith('demo-')) return false;
  const { data } = await supabase.rpc('record_reel_view', { p_reel_id: reelId });
  return data ?? false;
}
