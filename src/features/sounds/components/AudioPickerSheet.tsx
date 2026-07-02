import { useEffect, useState } from 'react';
import { MusicPickerSheet } from '@/features/music/components/MusicPickerSheet';
import { SoundPickerSheet } from '@/features/sounds/components/SoundPickerSheet';
import type { MusicSelection, MusicTrack } from '@/features/music/types';

type AudioPickerMode = 'music' | 'sound';

type AudioPickerSheetProps = {
  visible: boolean;
  selectedTrackId?: string | null;
  onClose: () => void;
  onSelect: (selection: MusicSelection) => void;
  pauseVideo?: () => void;
  /** Hangi kütüphane önce açılsın — gönderi/hikâye düzenlemede müzik keşfi */
  initialMode?: AudioPickerMode;
  /** true: satıra tıklayınca detay sayfasına gitme, yalnızca seçim/önizleme */
  selectionMode?: boolean;
};

export function AudioPickerSheet({
  visible,
  selectedTrackId,
  onClose,
  onSelect,
  pauseVideo,
  initialMode = 'music',
  selectionMode = true,
}: AudioPickerSheetProps) {
  const [mode, setMode] = useState<AudioPickerMode>(initialMode);

  useEffect(() => {
    if (visible) setMode(initialMode);
  }, [visible, initialMode]);

  if (!visible) return null;

  if (mode === 'music') {
    return (
      <MusicPickerSheet
        visible
        selectedTrackId={selectedTrackId ?? null}
        onClose={onClose}
        selectionMode={selectionMode}
        onSelect={(track: MusicTrack) => {
          onSelect({
            source: 'music',
            trackId: track.id,
            displayTitle: track.displayTitle,
            artist: track.artist,
            audioUrl: track.audioUrl,
            durationSec: track.durationSec,
            musicStartSec: 0,
            musicEndSec: track.durationSec,
            musicVolume: 0.8,
            originalAudioVolume: 1,
          });
        }}
        pauseVideo={pauseVideo}
        alternateModeLabel="Sesler"
        onAlternateMode={() => setMode('sound')}
      />
    );
  }

  return (
    <SoundPickerSheet
      visible
      selectedSoundId={selectedTrackId ?? null}
      onClose={onClose}
      selectionMode={selectionMode}
      onSelect={onSelect}
      pauseVideo={pauseVideo}
      alternateModeLabel="Müzik"
      onAlternateMode={() => setMode('music')}
    />
  );
}
