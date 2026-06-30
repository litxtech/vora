import { File } from 'expo-file-system';

/** Image picker bazen `file://` olmadan mutlak yol döner; fetch/URL bunu reddeder. */
export function normalizeLocalFileUri(uri: string): string {
  const trimmed = uri.trim();
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

/** iOS'ta fetch(file://) güvenilir değil; yerel dosyayı doğrudan okur. */
export async function readLocalFileBytes(uri: string): Promise<ArrayBuffer> {
  const file = new File(normalizeLocalFileUri(uri));
  if (!file.exists) {
    throw new Error('Dosya okunamadı.');
  }
  return file.arrayBuffer();
}

export function getLocalFileSize(uri: string): number {
  const file = new File(normalizeLocalFileUri(uri));
  if (!file.exists) return 0;
  return file.info().size ?? 0;
}
