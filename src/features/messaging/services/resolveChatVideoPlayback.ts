import { File, Paths } from 'expo-file-system';
import { supabase } from '@/lib/supabase/client';

const MIN_CACHE_BYTES = 1024;
const DOWNLOAD_TIMEOUT_MS = 25_000;

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function extractMessageMediaPath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/message-media\/([^?]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function resolveDownloadUrl(uri: string): Promise<string> {
  const storagePath = extractMessageMediaPath(uri);
  if (!storagePath) return uri;

  const { data, error } = await supabase.storage.from('message-media').createSignedUrl(storagePath, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;

  return uri;
}

function isValidCache(file: File): boolean {
  if (!file.exists) return false;
  return (file.info().size ?? 0) >= MIN_CACHE_BYTES;
}

async function downloadToCache(sourceUrl: string, dest: File): Promise<File | null> {
  if (dest.exists) {
    dest.delete();
  }

  const downloaded = await File.downloadFileAsync(sourceUrl, dest);
  return isValidCache(downloaded) ? downloaded : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('download-timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Uzak videoyu önbelleğe indirmeyi dener; olmazsa stream URL döner. */
export async function resolveChatVideoPlaybackUri(uri: string): Promise<string> {
  const trimmed = uri.trim();
  if (!trimmed) throw new Error('Video adresi bulunamadı.');
  if (!isRemoteUri(trimmed)) return trimmed;

  const rawName = trimmed.split('/').pop()?.split('?')[0] ?? 'chat-video.mp4';
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = new File(Paths.cache, `chat-playback-${safeName}`);

  if (isValidCache(dest)) {
    return dest.uri;
  }

  if (dest.exists) {
    dest.delete();
  }

  try {
    const downloadUrl = await resolveDownloadUrl(trimmed);
    const downloaded = await withTimeout(downloadToCache(downloadUrl, dest), DOWNLOAD_TIMEOUT_MS);
    if (downloaded) {
      return downloaded.uri;
    }
  } catch (err) {
    if (__DEV__) console.warn('[chat-video] cache download failed, using stream URL', err);
    if (dest.exists) {
      dest.delete();
    }
  }

  const streamUrl = await resolveDownloadUrl(trimmed);
  return streamUrl;
}
