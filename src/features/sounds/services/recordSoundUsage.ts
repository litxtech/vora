import type { MusicSelection } from '@/features/music/types';
import { musicSelectionToDbFields, recordMusicUsage } from '@/features/music/services/recordUsage';
import type { SoundSelection } from '@/features/sounds/types';
import { invalidateSoundCache } from '@/features/sounds/services/soundCache';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.8;
  return Math.round(Math.min(9.99, Math.max(0, value)) * 100) / 100;
}

function clampSec(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(999999.99, Math.max(0, value)) * 100) / 100;
}

function normalizeSoundSelection(selection: SoundSelection): SoundSelection {
  const musicStartSec = clampSec(selection.musicStartSec);
  let musicEndSec = clampSec(selection.musicEndSec);
  if (musicEndSec <= musicStartSec) {
    musicEndSec = musicStartSec + clampSec(selection.durationSec || 30);
  }
  return {
    ...selection,
    musicStartSec,
    musicEndSec,
    musicVolume: clampVolume(selection.musicVolume),
    originalAudioVolume: clampVolume(selection.originalAudioVolume),
  };
}

export async function recordSoundUsage(
  selection: SoundSelection,
  input: { postId?: string | null; reelId?: string | null; storyItemId?: string | null },
): Promise<{ error: string | null }> {
  const normalized = normalizeSoundSelection(selection);
  const { error } = await supabase.rpc('record_sound_usage', {
    p_sound_id: normalized.soundId,
    p_post_id: input.postId ?? null,
    p_reel_id: input.reelId ?? null,
    p_story_item_id: input.storyItemId ?? null,
    p_music_start_sec: normalized.musicStartSec,
    p_music_end_sec: normalized.musicEndSec,
    p_music_volume: normalized.musicVolume,
    p_original_audio_volume: normalized.originalAudioVolume,
  });

  if (!error) invalidateSoundCache();
  return { error: supabaseErrorMessage(error) };
}

export function soundSelectionToDbFields(selection: SoundSelection | null) {
  if (!selection) {
    return {
      sound_id: null,
      music_start_sec: null,
      music_end_sec: null,
      music_volume: null,
      original_audio_volume: null,
    };
  }

  const normalized = normalizeSoundSelection(selection);
  return {
    sound_id: normalized.soundId,
    music_start_sec: normalized.musicStartSec,
    music_end_sec: normalized.musicEndSec,
    music_volume: normalized.musicVolume,
    original_audio_volume: normalized.originalAudioVolume,
  };
}

export function soundToMusicSelection(sound: {
  id: string;
  title: string;
  audioUrl: string;
  durationSec: number;
  authorUsername?: string;
}): MusicSelection {
  const endSec = Math.min(sound.durationSec, 60);
  return {
    source: 'sound',
    trackId: sound.id,
    displayTitle: sound.title,
    artist: sound.authorUsername ? `@${sound.authorUsername}` : 'Orijinal Ses',
    audioUrl: sound.audioUrl,
    durationSec: sound.durationSec,
    musicStartSec: 0,
    musicEndSec: endSec,
    musicVolume: 0.8,
    originalAudioVolume: 1,
  };
}

export function musicSelectionToSoundSelection(selection: MusicSelection): SoundSelection | null {
  if (selection.source !== 'sound') return null;
  return {
    soundId: selection.trackId,
    title: selection.displayTitle,
    audioUrl: selection.audioUrl,
    durationSec: selection.durationSec,
    musicStartSec: selection.musicStartSec,
    musicEndSec: selection.musicEndSec,
    musicVolume: selection.musicVolume,
    originalAudioVolume: selection.originalAudioVolume,
    authorUsername: selection.artist.replace(/^@/, ''),
  };
}

export async function recordAudioUsage(
  selection: MusicSelection,
  input: { postId?: string | null; reelId?: string | null; storyItemId?: string | null },
): Promise<{ error: string | null }> {
  if (selection.source === 'sound') {
    const soundSelection = musicSelectionToSoundSelection(selection);
    if (!soundSelection) return { error: null };
    return recordSoundUsage(soundSelection, input);
  }

  return recordMusicUsage(selection, input);
}

export function audioSelectionToDbFields(selection: MusicSelection | null) {
  if (!selection) {
    return {
      music_track_id: null,
      sound_id: null,
      music_start_sec: null,
      music_end_sec: null,
      music_volume: null,
      original_audio_volume: null,
    };
  }

  if (selection.source === 'sound') {
    const soundFields = soundSelectionToDbFields(musicSelectionToSoundSelection(selection));
    return {
      music_track_id: null,
      ...soundFields,
    };
  }

  return {
    sound_id: null,
    ...musicSelectionToDbFields(selection),
  };
}

export function isSoundSelection(selection: MusicSelection | null | undefined): boolean {
  return selection?.source === 'sound';
}
