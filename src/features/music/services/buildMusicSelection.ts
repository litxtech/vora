import type { MusicSelection } from '@/features/music/types';
import type { StudioEditorState } from '@/features/vora-studio/types';

export function buildMusicSelectionFromEditor(state: StudioEditorState): MusicSelection | null {
  if (!state.selectedMusicId || !state.selectedMusicAudioUrl) return null;

  return {
    trackId: state.selectedMusicId,
    displayTitle: state.selectedMusicTitle ?? 'Müzik',
    artist: state.selectedMusicArtist ?? '',
    audioUrl: state.selectedMusicAudioUrl,
    durationSec: state.selectedMusicDurationSec,
    musicStartSec: state.musicStartSec,
    musicEndSec: state.musicEndSec,
    musicVolume: state.musicVolume,
    originalAudioVolume: state.originalAudioVolume,
  };
}
