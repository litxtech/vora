import { File } from 'expo-file-system';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  return bytesToHex(sha256(toUint8Array(data)));
}

export async function sha256HexFromString(text: string): Promise<string> {
  return bytesToHex(sha256(utf8ToBytes(text)));
}

export type ContentHashInput = {
  postId: string;
  userId: string;
  publisherKey: string;
  timestamp: string;
  textContent: string;
  mediaHashes: string[];
};

/**
 * VCTS Trust Core: SHA256(post_id + user_id + publisher_key + timestamp + content_binary_hashes + text)
 */
export async function computeContentHash(input: ContentHashInput): Promise<string> {
  const parts = [
    input.postId,
    input.userId,
    input.publisherKey,
    input.timestamp,
    input.textContent.trim(),
    ...input.mediaHashes,
  ].join('|');

  return sha256HexFromString(parts);
}

export async function hashMediaBytes(bytes: ArrayBuffer): Promise<string> {
  return sha256Hex(bytes);
}

/** Hash a local file URI (uses compressed output for large videos). */
export async function hashFileUri(uri: string): Promise<string> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  return sha256Hex(buffer);
}
