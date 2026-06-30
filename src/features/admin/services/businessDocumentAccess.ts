import { supabase } from '@/lib/supabase/client';
import * as FileSystem from 'expo-file-system/legacy';
import { toDisplayUri } from '@/features/admin/services/adminDocumentPresentation';

const BUSINESS_DOCUMENTS_BUCKET = 'business-documents';
const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}business-admin/`;

export function isBusinessDocumentPdf(urlOrPath: string): boolean {
  const lower = urlOrPath.toLowerCase();
  return lower.endsWith('.pdf') || lower.includes('.pdf?');
}

export function normalizeBusinessDocumentPath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  const marker = '/business-documents/';
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex >= 0) {
    const path = trimmed.slice(markerIndex + marker.length).split('?')[0];
    return path || null;
  }

  const withoutBucket = trimmed.replace(/^business-documents\//, '');
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
    .from(BUSINESS_DOCUMENTS_BUCKET)
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

async function createSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (!error && data?.signedUrl) return data.signedUrl;
  return null;
}

export async function getBusinessDocumentSignedUrl(urlOrPath: string): Promise<string | null> {
  const storagePath = normalizeBusinessDocumentPath(urlOrPath);
  if (!storagePath) return null;

  const signedUrl = await createSignedUrl(storagePath);
  if (signedUrl) return signedUrl;

  const cached = await downloadToCache(storagePath);
  return cached ? toDisplayUri(cached) : null;
}

export async function getBusinessDocumentViewUri(urlOrPath: string): Promise<string | null> {
  const storagePath = normalizeBusinessDocumentPath(urlOrPath);
  if (!storagePath) return null;

  if (isBusinessDocumentPdf(urlOrPath)) {
    const cached = await downloadToCache(storagePath);
    if (cached) return toDisplayUri(cached);
  }

  const signedUrl = await createSignedUrl(storagePath);
  if (signedUrl) return signedUrl;

  const cached = await downloadToCache(storagePath);
  return cached ? toDisplayUri(cached) : null;
}
