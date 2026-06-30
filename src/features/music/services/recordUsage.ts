import type { MusicSelection } from '@/features/music/types';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { invalidateMusicCache } from '@/features/music/services/musicCache';
import { isPersistableMusicTrackId } from '@/features/music/utils/trackId';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function clampMusicVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.8;
  return Math.round(Math.min(9.99, Math.max(0, value)) * 100) / 100;
}

function clampMusicSec(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(999999.99, Math.max(0, value)) * 100) / 100;
}

function normalizeMusicSelection(selection: MusicSelection): MusicSelection {
  const musicStartSec = clampMusicSec(selection.musicStartSec);
  let musicEndSec = clampMusicSec(selection.musicEndSec);
  if (musicEndSec <= musicStartSec) {
    musicEndSec = musicStartSec + clampMusicSec(selection.durationSec || 30);
  }
  return {
    ...selection,
    musicStartSec,
    musicEndSec,
    musicVolume: clampMusicVolume(selection.musicVolume),
    originalAudioVolume: clampMusicVolume(selection.originalAudioVolume),
  };
}

export async function recordMusicUsage(
  selection: MusicSelection,
  input: { postId?: string | null; reelId?: string | null },
): Promise<{ error: string | null }> {
  if (!isPersistableMusicTrackId(selection.trackId)) {
    return { error: null };
  }

  const normalized = normalizeMusicSelection(selection);
  const { error } = await supabase.rpc('record_music_usage', {
    p_track_id: normalized.trackId,
    p_post_id: input.postId ?? null,
    p_reel_id: input.reelId ?? null,
    p_music_start_sec: normalized.musicStartSec,
    p_music_end_sec: normalized.musicEndSec,
    p_music_volume: normalized.musicVolume,
    p_original_audio_volume: normalized.originalAudioVolume,
  });

  if (!error) invalidateMusicCache();
  return { error: supabaseErrorMessage(error) };
}

export function editManifestToDbField(manifest: PublishedEditManifest | null) {
  return { edit_manifest: manifest };
}

export function musicSelectionToDbFields(selection: MusicSelection | null) {
  if (!selection || !isPersistableMusicTrackId(selection.trackId)) {
    return {
      music_track_id: null,
      music_start_sec: null,
      music_end_sec: null,
      music_volume: null,
      original_audio_volume: null,
    };
  }

  const normalized = normalizeMusicSelection(selection);
  return {
    music_track_id: normalized.trackId,
    music_start_sec: normalized.musicStartSec,
    music_end_sec: normalized.musicEndSec,
    music_volume: normalized.musicVolume,
    original_audio_volume: normalized.originalAudioVolume,
  };
}

export function getMusicPersistenceError(selection: MusicSelection | null | undefined): string | null {
  if (!selection) return null;
  if (isPersistableMusicTrackId(selection.trackId)) return null;
  return 'Seçilen müzik paylaşıma kaydedilemiyor. Lütfen listeden lisanslı bir parça seçin.';
}
