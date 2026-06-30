import { isMusicTrackPlayable, PHOTO_POST_MUSIC_DURATION_SEC } from '@/features/music/constants';
import { resolvePlayableMusicUrl } from '@/features/music/constants/demoTracks';
import type { MusicAttribution, MusicPlaybackConfig } from '@/features/music/types';

type MusicTrackJoin =
  | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }
  | { id: string; display_title: string; artist: string; audio_url?: string; duration_seconds?: number }[]
  | null;

export type PostMusicRow = {
  music_track_id: string | null;
  music_start_sec: number | null;
  music_end_sec: number | null;
  music_volume: number | null;
  original_audio_volume: number | null;
  music_tracks: MusicTrackJoin;
};

function unwrapTrack(tracks: MusicTrackJoin) {
  if (!tracks) return null;
  return Array.isArray(tracks) ? tracks[0] ?? null : tracks;
}

export function mapPostMusicAttribution(row: PostMusicRow): MusicAttribution | null {
  if (!row.music_track_id) return null;
  const track = unwrapTrack(row.music_tracks);
  if (!track) return null;
  return {
    trackId: track.id,
    displayTitle: track.display_title,
    artist: track.artist,
  };
}

export function mapPostMusicPlayback(row: PostMusicRow): MusicPlaybackConfig | null {
  if (!row.music_track_id) return null;
  const track = unwrapTrack(row.music_tracks);
  if (!track?.audio_url || !isMusicTrackPlayable(track.audio_url)) return null;

  const musicStartSec = Number(row.music_start_sec ?? 0);
  const originalAudioVolume = Number(row.original_audio_volume ?? 0);
  let musicEndSec =
    Number(row.music_end_sec ?? track.duration_seconds ?? 0) || Number(track.duration_seconds ?? 30);

  if (originalAudioVolume <= 0.001) {
    musicEndSec = Math.min(musicEndSec, musicStartSec + PHOTO_POST_MUSIC_DURATION_SEC);
  }

  return {
    audioUrl: resolvePlayableMusicUrl(track.audio_url, track.id),
    musicStartSec,
    musicEndSec,
    musicVolume: Number(row.music_volume ?? 0.8),
    originalAudioVolume,
  };
}
