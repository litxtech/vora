import { IDENTITY_STORAGE_BUCKET } from '@/features/identity-verification/constants';
import { supabase } from '@/lib/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}identity-admin/`;

function normalizeIdentityDocumentPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  const withoutBucket = trimmed.replace(/^identity-documents\//, '');
  return withoutBucket || null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return globalThis.btoa(binary);
}

function cacheFilePath(storagePath: string): string {
  const safeName = storagePath.replace(/[^\w.-]+/g, '_');
  return `${CACHE_DIR}${safeName}`;
}

async function downloadToCache(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(IDENTITY_STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) return null;

  try {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    const cachePath = cacheFilePath(storagePath);
    const base64 = arrayBufferToBase64(await data.arrayBuffer());
    await FileSystem.writeAsStringAsync(cachePath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return cachePath;
  } catch {
    return null;
  }
}

export async function getIdentityDocumentSignedUrl(path: string): Promise<string | null> {
  const storagePath = normalizeIdentityDocumentPath(path);
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(IDENTITY_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (!error && data?.signedUrl) return data.signedUrl;

  return downloadToCache(storagePath);
}
