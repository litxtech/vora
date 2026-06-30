import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { ChatMessage, EphemeralImageMetadata } from '../types';

export type { EphemeralImageMetadata };

function isTruthyEphemeralFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function parseEphemeralImageMetadata(metadata: unknown): EphemeralImageMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const row = metadata as Record<string, unknown>;
  if (!isTruthyEphemeralFlag(row.ephemeral)) return null;
  const durationSec =
    typeof row.durationSec === 'number'
      ? row.durationSec
      : typeof row.duration_sec === 'number'
        ? row.duration_sec
        : 10;
  return {
    ephemeral: true,
    durationSec,
    viewedAt:
      typeof row.viewedAt === 'string'
        ? row.viewedAt
        : typeof row.viewed_at === 'string'
          ? row.viewed_at
          : null,
    expired: row.expired === true,
  };
}

export function isEphemeralImageMessage(message: Pick<ChatMessage, 'messageType' | 'metadata'>): boolean {
  return message.messageType === 'image' && parseEphemeralImageMetadata(message.metadata) !== null;
}

/** Süreli (kaybolan) medya — fotoğraf veya video. */
export function isEphemeralMediaMessage(
  message: Pick<ChatMessage, 'messageType' | 'metadata'>,
): boolean {
  return (
    (message.messageType === 'image' || message.messageType === 'video') &&
    parseEphemeralImageMetadata(message.metadata) !== null
  );
}

export function isEphemeralImageExpired(
  message: Pick<ChatMessage, 'deletedForAll' | 'metadata'>,
): boolean {
  if (message.deletedForAll) return true;
  const meta = parseEphemeralImageMetadata(message.metadata);
  return meta?.expired === true;
}

export function shouldBlurEphemeralImage(
  message: Pick<ChatMessage, 'senderId' | 'deletedForAll' | 'metadata'>,
  viewerId: string | null | undefined,
): boolean {
  if (!viewerId || message.senderId === viewerId) return false;
  if (isEphemeralImageExpired(message)) return false;
  const meta = parseEphemeralImageMetadata(message.metadata);
  return meta !== null && !meta.viewedAt;
}

export function getEphemeralViewedAtMs(metadata: unknown): number | null {
  const meta = parseEphemeralImageMetadata(metadata);
  if (!meta?.viewedAt) return null;
  const ms = new Date(meta.viewedAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function getEphemeralRemainingSec(
  metadata: unknown,
  viewedAtMs: number | null,
): number | null {
  const meta = parseEphemeralImageMetadata(metadata);
  if (!meta || meta.expired || !viewedAtMs) return null;
  const remaining = Math.ceil((viewedAtMs + meta.durationSec * 1000 - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Sürenin biteceği an (ms). Süreli fotoğraf YALNIZCA alıcı görüntüledikten sonra
 * silinir; görüntülenene kadar her iki tarafta da kalır. Görüntülenme `viewedAt`
 * olarak metadata'ya yazılır ve realtime ile gönderene de ulaşır, böylece her iki
 * istemci de aynı anda (görüntülenme + süre) sona erdirir.
 */
export function resolveEphemeralExpiryAtMs(
  message: Pick<ChatMessage, 'senderId' | 'createdAt' | 'metadata' | 'deletedForAll'>,
  viewerId: string | null | undefined,
  localViewedAtMs?: number | null,
): number | null {
  if (isEphemeralImageExpired(message)) return null;
  const meta = parseEphemeralImageMetadata(message.metadata);
  if (!meta || !viewerId) return null;

  const viewedAtMs = localViewedAtMs ?? getEphemeralViewedAtMs(message.metadata);
  if (viewedAtMs) {
    return viewedAtMs + meta.durationSec * 1000;
  }

  return null;
}

export async function markEphemeralImageViewed(messageId: string): Promise<{ error: string | null }> {
  const { data } = await supabase.from('messages').select('metadata').eq('id', messageId).maybeSingle();
  const existing =
    data?.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : {};
  const meta = parseEphemeralImageMetadata(existing);
  if (!meta || meta.viewedAt) return { error: null };

  const { error } = await supabase
    .from('messages')
    .update({
      metadata: {
        ...existing,
        ephemeral: true,
        durationSec: meta.durationSec,
        viewedAt: new Date().toISOString(),
      },
    })
    .eq('id', messageId);

  return { error: supabaseErrorMessage(error) };
}

export async function expireEphemeralImageMessage(messageId: string): Promise<{ error: string | null }> {
  const { error: rpcError } = await supabase.rpc('expire_ephemeral_message', {
    p_message_id: messageId,
  });

  if (!rpcError) return { error: null };

  const { data } = await supabase.from('messages').select('metadata').eq('id', messageId).maybeSingle();
  const existing =
    data?.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from('messages')
    .update({
      deleted_for_all: true,
      content: '',
      media_url: null,
      metadata: {
        ...existing,
        ephemeral: true,
        expired: true,
      },
    })
    .eq('id', messageId);

  return { error: supabaseErrorMessage(error ?? rpcError) };
}

export function buildEphemeralImageMetadata(durationSec: number): EphemeralImageMetadata {
  return { ephemeral: true, durationSec };
}
