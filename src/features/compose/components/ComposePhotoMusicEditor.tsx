import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MusicEditorPanel } from '@/features/music/components/MusicEditorPanel';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { fetchMusicTrackById } from '@/features/music/services/musicData';
import type { MusicSelection, MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ComposePhotoMusicEditorProps = {
  music: MusicSelection;
  onUpdate: (patch: Partial<MusicSelection>) => void;
  onRemove: () => void;
  onChangeTrack: () => void;
};

export function ComposePhotoMusicEditor({
  music,
  onUpdate,
  onRemove,
  onChangeTrack,
}: ComposePhotoMusicEditorProps) {
  const { colors } = useTheme();
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  useEffect(() => {
    void fetchMusicTrackById(music.trackId).then(setTrack);
  }, [music.trackId]);

  useStandaloneMusicPlayer({
    config: {
      audioUrl: music.audioUrl,
      musicStartSec: music.musicStartSec,
      musicEndSec: music.musicEndSec,
      musicVolume: music.musicVolume,
      originalAudioVolume: 0,
    },
    scopeActive: Boolean(track),
    playing: previewPlaying,
  });

  if (!track) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MusicEditorPanel
        mode="photo"
        track={track}
        clipDurationSec={Math.max(0.5, music.musicEndSec - music.musicStartSec)}
        musicStartSec={music.musicStartSec}
        musicEndSec={music.musicEndSec}
        musicVolume={music.musicVolume}
        originalAudioVolume={0}
        isPlaying={previewPlaying}
        onStartChange={(sec) => onUpdate({ musicStartSec: sec })}
        onRangeChange={(startSec, endSec) => onUpdate({ musicStartSec: startSec, musicEndSec: endSec })}
        onMusicVolumeChange={(volume) => onUpdate({ musicVolume: volume })}
        onOriginalVolumeChange={() => undefined}
        onRemove={onRemove}
        onChangeTrack={onChangeTrack}
        onTogglePreview={() => setPreviewPlaying((v) => !v)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
