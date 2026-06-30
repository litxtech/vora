import * as DocumentPicker from 'expo-document-picker';
import { MUSIC_ACCEPTED_AUDIO_MIME, MUSIC_LIBRARY_BUCKET, MUSIC_PENDING_AUDIO_URL } from '@/features/music/constants';
import { invalidateMusicCache } from '@/features/music/services/musicCache';
import type {
  MusicCategoryAdminRow,
  MusicLicenseStatus,
  MusicPublicationStatus,
  MusicTrackAdminRow,
} from '@/features/music/types';
import { getAudioDurationSeconds } from '@/lib/notifications/soundSync';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

const TRACK_SELECT = `
  id, title, display_title, artist, album, category_id, cover_url, cover_storage_path,
  audio_url, audio_storage_path, duration_seconds, license_status, license_info,
  publication_status, is_trending, is_featured, is_editor_pick, sort_order,
  usage_count, view_count, last_used_at, created_at,
  music_categories (slug, label)
`;

type TrackRow = {
  id: string;
  title: string;
  display_title: string;
  artist: string;
  album: string | null;
  category_id: string | null;
  cover_url: string | null;
  cover_storage_path: string | null;
  audio_url: string;
  audio_storage_path: string | null;
  duration_seconds: number;
  license_status: MusicLicenseStatus;
  license_info: string | null;
  publication_status: MusicPublicationStatus;
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

function mapTrack(row: TrackRow): MusicTrackAdminRow {
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
    coverStoragePath: row.cover_storage_path,
    audioUrl: row.audio_url,
    audioStoragePath: row.audio_storage_path,
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

export async function fetchAdminMusicTracks(search = '', limit = 50, offset = 0): Promise<MusicTrackAdminRow[]> {
  let query = supabase
    .from('music_tracks')
    .select(TRACK_SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) {
    query = query.or(
      `display_title.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%,artist.ilike.%${search.trim()}%`,
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as TrackRow[]).map(mapTrack);
}

export async function fetchAdminMusicCategories(): Promise<MusicCategoryAdminRow[]> {
  const { data, error } = await supabase
    .from('music_categories')
    .select('id, slug, label, sort_order, is_active')
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

export async function createMusicCategory(label: string, slug: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('music_categories').insert({
    label: label.trim(),
    slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
  });
  if (!error) invalidateMusicCache();
  return { error: supabaseErrorMessage(error) };
}

export type UpsertMusicTrackInput = {
  id?: string;
  title: string;
  displayTitle: string;
  artist: string;
  album?: string | null;
  categoryId?: string | null;
  licenseStatus: MusicLicenseStatus;
  licenseInfo?: string | null;
  publicationStatus: MusicPublicationStatus;
  isTrending?: boolean;
  isFeatured?: boolean;
  isEditorPick?: boolean;
  sortOrder?: number;
  audioUrl?: string;
  coverUrl?: string | null;
};

export async function upsertMusicTrack(
  adminId: string,
  input: UpsertMusicTrackInput,
): Promise<{ id: string | null; error: string | null }> {
  const payload = {
    title: input.title.trim(),
    display_title: input.displayTitle.trim(),
    artist: input.artist.trim(),
    album: input.album?.trim() || null,
    category_id: input.categoryId ?? null,
    license_status: input.licenseStatus,
    license_info: input.licenseInfo ?? null,
    publication_status: input.publicationStatus,
    is_trending: input.isTrending ?? false,
    is_featured: input.isFeatured ?? false,
    is_editor_pick: input.isEditorPick ?? false,
    sort_order: input.sortOrder ?? 0,
    audio_url: input.audioUrl,
    cover_url: input.coverUrl ?? null,
    created_by: adminId,
  };

  if (input.id) {
    const { created_by: _ignored, ...updatePayload } = payload;
    const { error } = await supabase.from('music_tracks').update(updatePayload).eq('id', input.id);
    if (!error) invalidateMusicCache();
    return { id: input.id, error: supabaseErrorMessage(error) };
  }

  const { data, error } = await supabase
    .from('music_tracks')
    .insert({
      ...payload,
      audio_url: input.audioUrl ?? MUSIC_PENDING_AUDIO_URL,
      duration_seconds: 0,
    })
    .select('id')
    .single();
  if (!error) invalidateMusicCache();
  return { id: data?.id ?? null, error: supabaseErrorMessage(error) };
}

export async function uploadMusicAudio(
  adminId: string,
  trackId: string,
  localUri: string,
  originalName: string,
): Promise<{ url: string | null; storagePath: string | null; durationSec: number; error: string | null }> {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'mp3';
  const durationSec = await getAudioDurationSeconds(localUri);
  const storagePath = `tracks/${trackId}/audio.${ext}`;

  const buffer = await readLocalFileBytes(localUri);

  const { error: uploadError } = await supabase.storage.from(MUSIC_LIBRARY_BUCKET).upload(storagePath, buffer, {
    contentType: ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`,
    upsert: true,
  });

  if (uploadError) return { url: null, storagePath: null, durationSec, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(MUSIC_LIBRARY_BUCKET).getPublicUrl(storagePath);

  const { error: dbError } = await supabase
    .from('music_tracks')
    .update({
      audio_storage_path: storagePath,
      audio_url: urlData.publicUrl,
      duration_seconds: durationSec,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackId);

  void adminId;
  if (!dbError) invalidateMusicCache();
  return { url: urlData.publicUrl, storagePath, durationSec, error: dbError?.message ?? null };
}

export async function uploadMusicCover(
  trackId: string,
  localUri: string,
  originalName: string,
): Promise<{ url: string | null; error: string | null }> {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const storagePath = `tracks/${trackId}/cover.${ext}`;

  const buffer = await readLocalFileBytes(localUri);

  const { error: uploadError } = await supabase.storage.from(MUSIC_LIBRARY_BUCKET).upload(storagePath, buffer, {
    contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
    upsert: true,
  });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(MUSIC_LIBRARY_BUCKET).getPublicUrl(storagePath);

  const { error: dbError } = await supabase
    .from('music_tracks')
    .update({ cover_storage_path: storagePath, cover_url: urlData.publicUrl })
    .eq('id', trackId);

  if (!dbError) invalidateMusicCache();
  return { url: urlData.publicUrl, error: dbError?.message ?? null };
}

export async function deleteMusicTrack(trackId: string): Promise<{ error: string | null }> {
  const { data } = await supabase
    .from('music_tracks')
    .select('audio_storage_path, cover_storage_path')
    .eq('id', trackId)
    .maybeSingle();

  const paths = [data?.audio_storage_path, data?.cover_storage_path].filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(MUSIC_LIBRARY_BUCKET).remove(paths);

  const { error } = await supabase.from('music_tracks').delete().eq('id', trackId);
  if (!error) invalidateMusicCache();
  return { error: supabaseErrorMessage(error) };
}

export async function pickMusicAudioFile() {
  return DocumentPicker.getDocumentAsync({
    type: [...MUSIC_ACCEPTED_AUDIO_MIME, 'audio/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
}

export async function pickMusicCoverFile() {
  return DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    copyToCacheDirectory: true,
  });
}
