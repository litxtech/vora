import type {
  PublishSoundInput,
  Sound,
  SoundAuthorStats,
  SoundDailyStat,
  SoundPrivacy,
  SoundReportReason,
} from '@/features/sounds/types';
import { defaultSoundTitle } from '@/features/sounds/constants';
import {
  getCachedSounds,
  invalidateSoundCache,
  setCachedSounds,
} from '@/features/sounds/services/soundCache';
import { uploadSoundAudio, uploadSoundCover } from '@/features/sounds/services/soundUpload';
import type { FeedAuthor } from '@/features/feed/types';
import type { UserRole } from '@/types/database';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type SoundRow = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  audio_url: string;
  duration_sec: number;
  privacy: SoundPrivacy;
  status: Sound['status'];
  tags: string[] | null;
  usage_count: number;
  listen_count: number;
  like_count: number;
  favorite_count: number;
  share_count: number;
  trend_score: number;
  points: number;
  is_trending: boolean;
  is_popular: boolean;
  badge_tier: number;
  last_used_at: string | null;
  created_at: string;
  profiles?: ProfileSnippet | ProfileSnippet[] | null;
};

type ProfileSnippet = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
};

const SOUND_SELECT = `
  id, author_id, title, description, cover_url, audio_url, duration_sec,
  privacy, status, tags, usage_count, listen_count, like_count, favorite_count,
  share_count, trend_score, points, is_trending, is_popular, badge_tier,
  last_used_at, created_at,
  profiles!sounds_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)
`;

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

function mapSound(row: SoundRow): Sound {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url,
    audioUrl: row.audio_url,
    durationSec: Number(row.duration_sec) || 0,
    privacy: row.privacy,
    status: row.status,
    tags: row.tags ?? [],
    usageCount: row.usage_count,
    listenCount: row.listen_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    shareCount: row.share_count,
    trendScore: Number(row.trend_score) || 0,
    points: row.points,
    isTrending: row.is_trending,
    isPopular: row.is_popular,
    badgeTier: row.badge_tier,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    author: mapProfileAuthor(row.profiles ?? null, row.author_id),
  };
}

export async function fetchTrendingSounds(limit = 30): Promise<Sound[]> {
  const cacheKey = `trend:${limit}`;
  const cached = getCachedSounds(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_trending_sounds', { p_limit: limit });
  if (error || !data) return [];

  const sounds = (data as SoundRow[]).map(mapSound);
  setCachedSounds(cacheKey, sounds);
  return sounds;
}

export async function fetchNewSounds(limit = 30): Promise<Sound[]> {
  const cacheKey = `new:${limit}`;
  const cached = getCachedSounds(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('sounds')
    .select(SOUND_SELECT)
    .eq('status', 'published')
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  const sounds = (data as unknown as SoundRow[]).map(mapSound);
  setCachedSounds(cacheKey, sounds);
  return sounds;
}

export async function fetchFollowingSounds(limit = 30): Promise<Sound[]> {
  const cacheKey = `following:${limit}`;
  const cached = getCachedSounds(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_following_sounds', { p_limit: limit });
  if (error || !data) return [];

  const sounds = (data as SoundRow[]).map(mapSound);
  setCachedSounds(cacheKey, sounds);
  return sounds;
}

export async function fetchSavedSounds(userId: string, limit = 30): Promise<Sound[]> {
  const cacheKey = `saved:${userId}:${limit}`;
  const cached = getCachedSounds(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('sound_favorites')
    .select(`created_at, sounds (${SOUND_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const sounds: Sound[] = [];
  for (const row of data) {
    const nested = row.sounds as unknown as SoundRow | SoundRow[] | null;
    const soundRow = Array.isArray(nested) ? nested[0] : nested;
    if (soundRow && soundRow.status === 'published') sounds.push(mapSound(soundRow));
  }

  setCachedSounds(cacheKey, sounds);
  return sounds;
}

export async function fetchMySounds(userId: string, limit = 30): Promise<Sound[]> {
  const cacheKey = `mine:${userId}:${limit}`;
  const cached = getCachedSounds(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('sounds')
    .select(SOUND_SELECT)
    .eq('author_id', userId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  const sounds = (data as unknown as SoundRow[]).map(mapSound);
  setCachedSounds(cacheKey, sounds);
  return sounds;
}

export async function searchSounds(query: string, limit = 30): Promise<Sound[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc('search_sounds', {
    p_query: trimmed,
    p_limit: limit,
  });

  if (error || !data) return [];
  return (data as SoundRow[]).map(mapSound);
}

export async function fetchSoundById(id: string): Promise<Sound | null> {
  const { data, error } = await supabase
    .from('sounds')
    .select(SOUND_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapSound(data as unknown as SoundRow);
}

export async function fetchUserSoundStats(userId: string): Promise<SoundAuthorStats> {
  const { data, error } = await supabase.rpc('get_user_sound_stats', { p_user_id: userId });

  if (error || !data?.length) {
    return { totalSounds: 0, totalUsage: 0, totalListens: 0, totalLikes: 0 };
  }

  const row = data[0] as {
    total_sounds: number;
    total_usage: number;
    total_listens: number;
    total_likes: number;
  };

  return {
    totalSounds: Number(row.total_sounds) || 0,
    totalUsage: Number(row.total_usage) || 0,
    totalListens: Number(row.total_listens) || 0,
    totalLikes: Number(row.total_likes) || 0,
  };
}

export async function fetchSoundDailyStats(soundId: string, days = 30): Promise<SoundDailyStat[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('sound_statistics')
    .select('stat_date, usage_count, listen_count, like_count, favorite_count, complete_listen_count')
    .eq('sound_id', soundId)
    .gte('stat_date', since.toISOString().slice(0, 10))
    .order('stat_date', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    statDate: row.stat_date,
    usageCount: row.usage_count,
    listenCount: row.listen_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    completeListenCount: row.complete_listen_count,
  }));
}

export async function publishSound(
  userId: string,
  username: string,
  input: PublishSoundInput,
): Promise<{ sound: Sound | null; error: string | null }> {
  const title = input.title.trim() || defaultSoundTitle(username);

  const audioUpload = await uploadSoundAudio(userId, input.localAudioUri);
  if (audioUpload.error) return { sound: null, error: audioUpload.error };

  let coverPath: string | null = null;
  let coverUrl: string | null = null;
  if (input.coverLocalUri) {
    const coverUpload = await uploadSoundCover(userId, input.coverLocalUri);
    if (coverUpload.error) return { sound: null, error: coverUpload.error };
    coverPath = coverUpload.path;
    coverUrl = coverUpload.url;
  }

  const { data, error } = await supabase
    .from('sounds')
    .insert({
      author_id: userId,
      title,
      description: input.description?.trim() || null,
      cover_storage_path: coverPath,
      cover_url: coverUrl,
      audio_storage_path: audioUpload.path,
      audio_url: audioUpload.url,
      duration_sec: input.durationSec,
      privacy: input.privacy,
      tags: input.tags ?? [],
      status: 'published',
    })
    .select(SOUND_SELECT)
    .single();

  if (error) return { sound: null, error: supabaseErrorMessage(error)! };

  invalidateSoundCache();
  return { sound: mapSound(data as unknown as SoundRow), error: null };
}

export async function toggleSoundLike(soundId: string): Promise<{ liked: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('toggle_sound_like', { p_sound_id: soundId });
  if (error) return { liked: false, error: supabaseErrorMessage(error)! };
  invalidateSoundCache();
  return { liked: Boolean(data), error: null };
}

export async function toggleSoundFavorite(
  soundId: string,
): Promise<{ favorited: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('toggle_sound_favorite', { p_sound_id: soundId });
  if (error) return { favorited: false, error: supabaseErrorMessage(error)! };
  invalidateSoundCache();
  return { favorited: Boolean(data), error: null };
}

export async function recordSoundListen(
  soundId: string,
  durationSec: number,
  completed: boolean,
): Promise<void> {
  await supabase.rpc('record_sound_listen', {
    p_sound_id: soundId,
    p_duration_sec: durationSec,
    p_completed: completed,
  });
}

export async function reportSound(
  soundId: string,
  reason: SoundReportReason,
  details?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('report_sound', {
    p_sound_id: soundId,
    p_reason: reason,
    p_details: details ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function checkSoundEngagement(
  soundId: string,
  userId: string,
): Promise<{ liked: boolean; favorited: boolean }> {
  const [likes, favorites] = await Promise.all([
    supabase
      .from('sound_likes')
      .select('sound_id')
      .eq('sound_id', soundId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('sound_favorites')
      .select('sound_id')
      .eq('sound_id', soundId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  return {
    liked: !!likes.data,
    favorited: !!favorites.data,
  };
}
