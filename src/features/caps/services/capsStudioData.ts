import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { uploadCapImage } from '@/features/caps/services/capsUpload';
import { getMuxPlaybackUrl, getMuxThumbnailUrl } from '@/lib/mux/client';
import type {
  Cap,
  CapOverlayStyle,
  CapSourceKind,
  CapVoraVideoOption,
} from '@/features/caps/types';
import { fetchCapById } from '@/features/caps/services/capsData';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { CAP_IMAGE_MAX_SIZE, CAPS_BUCKET } from '@/features/caps/constants';

export async function fetchMyVoraVideosForCaps(
  userId: string,
  limit = 40,
): Promise<CapVoraVideoOption[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, mux_playback_id, thumbnail_url, duration_seconds, created_at, status')
    .eq('owner_id', userId)
    .eq('status', 'ready')
    .not('mux_playback_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((row) => Boolean(row.mux_playback_id))
    .map((row) => {
      const playbackId = row.mux_playback_id as string;
      const durationSec = Number(row.duration_seconds ?? 0);
      return {
        videoId: row.id,
        playbackId,
        playbackUrl: getMuxPlaybackUrl(playbackId),
        thumbnailUrl: row.thumbnail_url ?? getMuxThumbnailUrl(playbackId, 1),
        durationMs: Math.max(1000, Math.round(durationSec * 1000)),
        title: row.title,
        createdAt: row.created_at,
      };
    });
}

async function uploadPosterFromUri(
  userId: string,
  localUri: string,
): Promise<{ url: string; path: string; width: number | null; height: number | null; error: string | null }> {
  try {
    const resized = await manipulateAsync(
      localUri,
      [{ resize: { width: CAP_IMAGE_MAX_SIZE } }],
      { compress: 0.88, format: SaveFormat.JPEG },
    );
    const bytes = await readLocalFileBytes(resized.uri);
    const path = `${userId}/${Date.now()}_poster.jpg`;
    const { error } = await supabase.storage.from(CAPS_BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) {
      return { url: '', path: '', width: null, height: null, error: supabaseErrorMessage(error) };
    }
    const { data } = supabase.storage.from(CAPS_BUCKET).getPublicUrl(path);
    return {
      url: data.publicUrl,
      path,
      width: resized.width ?? null,
      height: resized.height ?? null,
      error: null,
    };
  } catch (err) {
    return { url: '', path: '', width: null, height: null, error: String(err) };
  }
}

async function posterFromLocalVideo(
  userId: string,
  videoUri: string,
  atMs: number,
): Promise<{ url: string; path: string; width: number | null; height: number | null; error: string | null }> {
  try {
    const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: Math.max(0, Math.round(atMs)),
      quality: 0.85,
    });
    return uploadPosterFromUri(userId, thumb.uri);
  } catch (err) {
    return { url: '', path: '', width: null, height: null, error: String(err) };
  }
}

export type CreateStudioCapInput = {
  userId: string;
  title?: string | null;
  sourceKind: CapSourceKind;
  /** Yerel fotoğraf URI */
  photoUri?: string | null;
  /** Yerel video URI (yalnızca poster için; video yeniden kesilmez) */
  localVideoUri?: string | null;
  /** Yerel video public URL (yüklenmişse) — opsiyonel */
  localVideoPublicUrl?: string | null;
  localVideoStoragePath?: string | null;
  sourceVideoId?: string | null;
  playbackUrl?: string | null;
  muxThumbUrl?: string | null;
  startMs: number;
  endMs: number;
  overlay: CapOverlayStyle;
  width?: number | null;
  height?: number | null;
};

/** Caps Studio kaydı: video kesilmez; meta + poster. */
export async function createCapFromStudio(
  input: CreateStudioCapInput,
): Promise<{ cap: Cap | null; error: string | null }> {
  const clipMs = Math.max(0, input.endMs - input.startMs);
  if (input.sourceKind !== 'photo' && (clipMs <= 0 || clipMs > 10500)) {
    return { cap: null, error: 'Caps aralığı 1–10 saniye olmalıdır' };
  }

  let imageUrl = '';
  let storagePath: string | null = null;
  let thumbUrl: string | null = null;
  let width = input.width ?? null;
  let height = input.height ?? null;
  let videoUrl: string | null = null;

  if (input.sourceKind === 'photo') {
    if (!input.photoUri) return { cap: null, error: 'Fotoğraf seçilmedi' };
    const upload = await uploadCapImage(input.userId, input.photoUri);
    if (upload.error || !upload.url || !upload.storagePath) {
      return { cap: null, error: upload.error ?? 'Fotoğraf yüklenemedi' };
    }
    imageUrl = upload.url;
    storagePath = upload.storagePath;
    thumbUrl = upload.thumbUrl;
    width = upload.width;
    height = upload.height;
  } else if (input.sourceKind === 'vora_video') {
    if (!input.sourceVideoId || !input.playbackUrl) {
      return { cap: null, error: 'Vora videosu seçilmedi' };
    }
    videoUrl = input.playbackUrl;
    // Poster: Mux thumbnail (storage_path boş kalabilir)
    const muxThumb =
      input.muxThumbUrl ??
      (input.playbackUrl.includes('stream.mux.com')
        ? input.playbackUrl.replace('stream.mux.com', 'image.mux.com').replace('.m3u8', `/thumbnail.jpg?time=${Math.max(0, input.startMs / 1000)}`)
        : null);
    if (muxThumb) {
      imageUrl = muxThumb;
      thumbUrl = muxThumb;
      storagePath = null;
    } else {
      return { cap: null, error: 'Poster oluşturulamadı' };
    }
  } else {
    // local_video — kesmeden: poster üret; video URL varsa kaydet
    if (!input.localVideoUri && !input.localVideoPublicUrl) {
      return { cap: null, error: 'Video seçilmedi' };
    }
    if (input.localVideoUri) {
      const poster = await posterFromLocalVideo(input.userId, input.localVideoUri, input.startMs);
      if (poster.error || !poster.url) {
        return { cap: null, error: poster.error ?? 'Poster oluşturulamadı' };
      }
      imageUrl = poster.url;
      thumbUrl = poster.url;
      storagePath = poster.path;
      width = poster.width;
      height = poster.height;
    }
    videoUrl = input.localVideoPublicUrl ?? null;
    if (input.localVideoStoragePath) storagePath = input.localVideoStoragePath;
  }

  const { data, error } = await supabase.rpc('create_cap', {
    p_image_url: imageUrl,
    p_storage_path: storagePath,
    p_thumb_url: thumbUrl,
    p_title: input.title ?? null,
    p_width: width,
    p_height: height,
    p_video_url: videoUrl,
    p_duration_ms: input.sourceKind === 'photo' ? null : clipMs,
    p_source_kind: input.sourceKind,
    p_source_video_id: input.sourceVideoId ?? null,
    p_start_ms: input.sourceKind === 'photo' ? null : input.startMs,
    p_end_ms: input.sourceKind === 'photo' ? null : input.endMs,
    p_overlay: input.overlay ?? {},
  });

  if (error) return { cap: null, error: supabaseErrorMessage(error) };
  const cap = await fetchCapById(data as string);
  return { cap, error: cap ? null : 'Caps oluşturuldu ama yüklenemedi' };
}
