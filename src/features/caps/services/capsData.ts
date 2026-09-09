import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { uploadCapImage, uploadCapVideo } from '@/features/caps/services/capsUpload';
import type {
  Cap,
  CapCreator,
  CapCreatorRank,
  CapLibrarySource,
  CapOverlayStyle,
  CapSourceKind,
  CapsDiscoverSort,
  CapUsageRow,
} from '@/features/caps/types';

type CapRow = {
  id: string;
  creator_id: string;
  title: string | null;
  image_url: string;
  thumb_url: string | null;
  video_url?: string | null;
  duration_ms?: number | null;
  width: number | null;
  height: number | null;
  source_kind?: CapSourceKind | null;
  source_video_id?: string | null;
  start_ms?: number | null;
  end_ms?: number | null;
  overlay?: CapOverlayStyle | null;
  status: Cap['status'];
  unique_user_count: number;
  library_count: number;
  last_used_at: string | null;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

function mapCreator(row: CapRow): CapCreator {
  const p = row.profiles;
  return {
    id: p?.id ?? row.creator_id,
    username: p?.username ?? 'kullanici',
    fullName: p?.full_name ?? null,
    avatarUrl: p?.avatar_url ?? null,
  };
}

function mapCap(row: CapRow, extras?: Partial<Pick<Cap, 'inLibrary' | 'librarySource'>>): Cap {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    imageUrl: row.image_url,
    thumbUrl: row.thumb_url,
    videoUrl: row.video_url ?? null,
    durationMs: row.duration_ms ?? null,
    width: row.width,
    height: row.height,
    sourceKind: row.source_kind ?? null,
    sourceVideoId: row.source_video_id ?? null,
    startMs: row.start_ms ?? null,
    endMs: row.end_ms ?? null,
    overlay: row.overlay ?? null,
    status: row.status,
    uniqueUserCount: row.unique_user_count ?? 0,
    libraryCount: row.library_count ?? 0,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    creator: mapCreator(row),
    inLibrary: extras?.inLibrary,
    librarySource: extras?.librarySource ?? null,
  };
}

const CAP_SELECT =
  'id, creator_id, title, image_url, thumb_url, video_url, duration_ms, width, height, source_kind, source_video_id, start_ms, end_ms, overlay, status, unique_user_count, library_count, last_used_at, created_at, profiles!caps_creator_id_fkey(id, username, full_name, avatar_url)';

export async function fetchLibraryCaps(userId: string): Promise<Cap[]> {
  const { data, error } = await supabase
    .from('user_cap_library')
    .select('source, created_at, cap_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const capIds = data.map((row) => row.cap_id as string);
  const { data: capsData, error: capsError } = await supabase
    .from('caps')
    .select(CAP_SELECT)
    .in('id', capIds)
    .eq('status', 'published');

  if (capsError || !capsData) return [];

  const byId = new Map((capsData as CapRow[]).map((row) => [row.id, row]));
  const sourceById = new Map(data.map((row) => [row.cap_id as string, row.source as CapLibrarySource]));

  return capIds
    .map((id) => {
      const row = byId.get(id);
      if (!row) return null;
      return mapCap(row, { inLibrary: true, librarySource: sourceById.get(id) ?? 'market' });
    })
    .filter(Boolean) as Cap[];
}

export async function fetchMarketCaps(limit = 60): Promise<Cap[]> {
  return fetchDiscoverCaps('popular', limit);
}

/** Caps keşfi: trend (son kullanım), yeni, popüler (tekil kullanıcı). */
export async function fetchDiscoverCaps(
  sort: CapsDiscoverSort = 'trending',
  limit = 80,
): Promise<Cap[]> {
  let query = supabase
    .from('caps')
    .select(CAP_SELECT)
    .eq('status', 'published');

  if (sort === 'new') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'popular') {
    query = query
      .order('unique_user_count', { ascending: false })
      .order('created_at', { ascending: false });
  } else {
    query = query
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('unique_user_count', { ascending: false })
      .order('created_at', { ascending: false });
  }

  const { data, error } = await query.limit(limit);
  if (error || !data) return [];
  return (data as CapRow[]).map((row) => mapCap(row));
}

export async function fetchCapsCreatorLeaderboard(limit = 50): Promise<CapCreatorRank[]> {
  const { data, error } = await supabase.rpc('get_caps_creator_leaderboard', {
    p_limit: limit,
  });

  if (error || !data) return [];

  return (data as {
    creator_id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    caps_count: number;
    total_unique_users: number;
    total_library_saves: number;
    rank: number;
  }[]).map((row) => ({
    creatorId: row.creator_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    capsCount: row.caps_count ?? 0,
    totalUniqueUsers: row.total_unique_users ?? 0,
    totalLibrarySaves: row.total_library_saves ?? 0,
    rank: row.rank,
  }));
}

export async function fetchMyCreatedCaps(userId: string): Promise<Cap[]> {
  const { data, error } = await supabase
    .from('caps')
    .select(CAP_SELECT)
    .eq('creator_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as CapRow[]).map((row) => mapCap(row, { inLibrary: true, librarySource: 'created' }));
}

export async function fetchCapById(capId: string): Promise<Cap | null> {
  const { data, error } = await supabase.from('caps').select(CAP_SELECT).eq('id', capId).maybeSingle();
  if (error || !data) return null;
  return mapCap(data as CapRow);
}

export async function isCapInLibrary(userId: string, capId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_cap_library')
    .select('cap_id')
    .eq('user_id', userId)
    .eq('cap_id', capId)
    .maybeSingle();
  return Boolean(data);
}

export async function createCapFromLocalUri(
  userId: string,
  localUri: string,
  title?: string | null,
): Promise<{ cap: Cap | null; error: string | null }> {
  const upload = await uploadCapImage(userId, localUri);
  if (upload.error || !upload.url || !upload.storagePath) {
    return { cap: null, error: upload.error ?? 'Yükleme başarısız' };
  }

  const { data, error } = await supabase.rpc('create_cap', {
    p_image_url: upload.url,
    p_storage_path: upload.storagePath,
    p_thumb_url: upload.thumbUrl,
    p_title: title ?? null,
    p_width: upload.width,
    p_height: upload.height,
    p_video_url: upload.videoUrl,
    p_duration_ms: upload.durationMs,
  });

  if (error) return { cap: null, error: supabaseErrorMessage(error) };

  const cap = await fetchCapById(data as string);
  return { cap, error: cap ? null : 'Caps oluşturuldu ama yüklenemedi' };
}

export async function createCapFromLocalVideoUri(
  userId: string,
  localUri: string,
  title?: string | null,
  knownDurationMs?: number | null,
): Promise<{ cap: Cap | null; error: string | null }> {
  const upload = await uploadCapVideo(userId, localUri, knownDurationMs);
  if (upload.error || !upload.videoUrl || !upload.storagePath || !upload.url) {
    return { cap: null, error: upload.error ?? 'Yükleme başarısız' };
  }

  const { data, error } = await supabase.rpc('create_cap', {
    p_image_url: upload.url,
    p_storage_path: upload.storagePath,
    p_thumb_url: upload.thumbUrl,
    p_title: title ?? null,
    p_width: upload.width,
    p_height: upload.height,
    p_video_url: upload.videoUrl,
    p_duration_ms: upload.durationMs,
  });

  if (error) return { cap: null, error: supabaseErrorMessage(error) };

  const cap = await fetchCapById(data as string);
  return { cap, error: cap ? null : 'Caps oluşturuldu ama yüklenemedi' };
}

export async function addCapToLibrary(capId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('add_cap_to_library', { p_cap_id: capId });
  return { error: supabaseErrorMessage(error) };
}

export async function removeCapFromLibrary(capId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_cap_from_library', { p_cap_id: capId });
  return { error: supabaseErrorMessage(error) };
}

export async function deleteOwnCap(capId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_own_cap', { p_cap_id: capId });
  return { error: supabaseErrorMessage(error) };
}

export async function recordCapUsage(capId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('record_cap_usage', { p_cap_id: capId });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchCapUsageList(capId: string, limit = 50): Promise<CapUsageRow[]> {
  const { data, error } = await supabase
    .from('cap_usage')
    .select(
      'user_id, first_used_at, last_used_at, profiles!cap_usage_user_id_fkey(username, full_name, avatar_url)',
    )
    .eq('cap_id', capId)
    .order('first_used_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const profile = row.profiles as {
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    return {
      userId: row.user_id,
      username: profile?.username ?? 'kullanici',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      firstUsedAt: row.first_used_at,
      lastUsedAt: row.last_used_at,
    };
  });
}

export function toCapMessageMetadata(cap: Cap): {
  kind: 'cap';
  capId: string;
  imageUrl: string;
  videoUrl: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  startMs: number | null;
  endMs: number | null;
  overlay: CapOverlayStyle | null;
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
} {
  return {
    kind: 'cap',
    capId: cap.id,
    imageUrl: cap.imageUrl,
    videoUrl: cap.videoUrl,
    thumbUrl: cap.thumbUrl,
    width: cap.width,
    height: cap.height,
    startMs: cap.startMs ?? null,
    endMs: cap.endMs ?? null,
    overlay: cap.overlay ?? null,
    creatorId: cap.creatorId,
    creatorUsername: cap.creator?.username ?? 'kullanici',
    creatorAvatarUrl: cap.creator?.avatarUrl ?? null,
  };
}

/** Mesaj mediaUrl: video varsa video, yoksa poster. */
export function capMediaUrl(cap: Cap): string {
  return cap.videoUrl || cap.imageUrl;
}
