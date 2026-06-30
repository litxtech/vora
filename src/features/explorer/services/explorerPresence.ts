import { EXPLORER_STALE_MS } from '@/features/explorer/constants';
import type { ExplorerMarker, ExplorerPresenceRow } from '@/features/explorer/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function mapRow(row: ExplorerPresenceRow): ExplorerMarker {
  return {
    id: `explorer-${row.user_id}`,
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    latitude: row.latitude,
    longitude: row.longitude,
    heading: row.heading,
    updatedAt: row.updated_at,
  };
}

function isFresh(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() < EXPLORER_STALE_MS;
}

export async function fetchExplorers(regionId: string): Promise<ExplorerMarker[]> {
  const { data, error } = await supabase.rpc('list_explorers', { p_region_id: regionId });
  if (error) throw new Error(supabaseErrorMessage(error)!);

  return ((data ?? []) as ExplorerPresenceRow[])
    .filter((row) => isFresh(row.updated_at))
    .map(mapRow);
}

export async function publishExplorerPresence(
  regionId: string,
  latitude: number,
  longitude: number,
  heading?: number | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('upsert_explorer_presence', {
    p_region_id: regionId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_heading: heading ?? null,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function clearExplorerPresence(): Promise<void> {
  await supabase.rpc('clear_explorer_presence');
}

export function mapPresencePayload(
  payload: Record<string, unknown>,
  profile?: Partial<ExplorerPresenceRow>,
): ExplorerMarker | null {
  const userId = String(payload.user_id ?? '');
  const updatedAt = String(payload.updated_at ?? '');
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);

  if (!userId || !updatedAt || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  if (payload.is_visible === false || !isFresh(updatedAt)) {
    return null;
  }

  return {
    id: `explorer-${userId}`,
    userId,
    username: profile?.username ?? String(payload.username ?? 'kaşif'),
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isVerified: profile?.is_verified ?? false,
    latitude,
    longitude,
    heading: payload.heading != null ? Number(payload.heading) : null,
    updatedAt,
  };
}
