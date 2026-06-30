import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MusicFilterChip } from '@/features/music/components/MusicFilterChip';
import { MusicTrimSlider } from '@/features/music/components/MusicTrimSlider';
import { MusicRangeTrimSlider } from '@/features/music/components/MusicRangeTrimSlider';
import { MUSIC_VOLUME_PRESETS } from '@/features/music/constants';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import type { MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicEditorPanelProps = {
  track: MusicTrack;
  mode?: 'video' | 'photo';
  clipDurationSec: number;
  musicStartSec: number;
  musicEndSec?: number;
  musicVolume: number;
  originalAudioVolume: number;
  isPlaying: boolean;
  onStartChange: (sec: number) => void;
  onRangeChange?: (startSec: number, endSec: number) => void;
  onMusicVolumeChange: (volume: number) => void;
  onOriginalVolumeChange: (volume: number) => void;
  onRemove: () => void;
  onChangeTrack: () => void;
  onTogglePreview: () => void;
};

export function MusicEditorPanel({
  track,
  mode = 'video',
  clipDurationSec,
  musicStartSec,
  musicEndSec,
  musicVolume,
  originalAudioVolume,
  onStartChange,
  onRangeChange,
  onMusicVolumeChange,
  onOriginalVolumeChange,
  onRemove,
  onChangeTrack,
  onTogglePreview,
  isPlaying,
}: MusicEditorPanelProps) {
  const { colors } = useTheme();
  const isPhoto = mode === 'photo';
  const resolvedEndSec = useMemo(() => {
    if (isPhoto && musicEndSec != null) return musicEndSec;
    return Math.min(musicStartSec + clipDurationSec, track.durationSec);
  }, [clipDurationSec, isPhoto, musicEndSec, musicStartSec, track.durationSec]);

  return (
    <View style={styles.panel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topActions}
      >
        <MusicFilterChip
          label={isPlaying ? 'Duraklat' : 'İzle'}
          icon={isPlaying ? 'pause' : 'play-circle-outline'}
          accent
          active={isPlaying}
          onPress={onTogglePreview}
        />
        <MusicFilterChip label="Müziği değiştir" icon="swap-horizontal" onPress={onChangeTrack} />
        <MusicFilterChip label="Kaldır" icon="close-outline" onPress={onRemove} />
      </ScrollView>

      <View style={[styles.trackCard, { backgroundColor: `${colors.textMuted}10` }]}>
        <View style={[styles.trackIcon, { backgroundColor: `${colors.accent}18` }]}>
          <Ionicons name="musical-notes" size={16} color={colors.accent} />
        </View>
        <View style={styles.trackMeta}>
          <Text variant="label" numberOfLines={1} style={styles.trackTitle}>
            {track.displayTitle}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {track.artist} · {formatMusicDuration(track.durationSec)}
          </Text>
          {isPhoto ? (
            <Text variant="caption" style={{ color: colors.primary, fontSize: 11 }}>
              Fotoğrafta çalınacak bölümü kırpın
            </Text>
          ) : originalAudioVolume <= 0.001 ? (
            <Text variant="caption" style={{ color: colors.primary, fontSize: 11 }}>
              Video sesi kapalı · İzle ile müzikli önizleme
            </Text>
          ) : (
            <Text variant="caption" secondary style={{ fontSize: 11 }}>
              Üstteki İzle ile videoyu müzikle birlikte dinleyin
            </Text>
          )}
        </View>
      </View>

      {isPhoto && onRangeChange ? (
        <MusicRangeTrimSlider
          trackDurationSec={track.durationSec}
          startSec={musicStartSec}
          endSec={resolvedEndSec}
          onRangeChange={onRangeChange}
        />
      ) : (
        <MusicTrimSlider
          trackDurationSec={track.durationSec}
          clipDurationSec={clipDurationSec}
          startSec={musicStartSec}
          onStartChange={onStartChange}
        />
      )}

      <Text secondary variant="caption" style={styles.rangeHint}>
        Bölüm: {formatMusicDuration(musicStartSec)} — {formatMusicDuration(resolvedEndSec)}
      </Text>

      {!isPhoto ? (
        <VolumeSegment
          label="Video sesi"
          value={originalAudioVolume}
          onChange={onOriginalVolumeChange}
          colors={colors}
        />
      ) : null}
      <VolumeSegment
        label="Müzik sesi"
        value={musicVolume}
        onChange={onMusicVolumeChange}
        colors={colors}
        accent
      />
    </View>
  );
}

function VolumeSegment({
  label,
  value,
  onChange,
  colors,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  accent?: boolean;
}) {
  const tint = accent ? colors.accent : colors.primary;

  return (
    <View style={styles.volumeBlock}>
      <View style={styles.volumeHeader}>
        <Text variant="caption" style={{ fontWeight: '600', fontSize: 12 }}>
          {label}
        </Text>
        <Text variant="caption" style={{ color: tint, fontWeight: '700' }}>
          {Math.round(value * 100)}%
        </Text>
      </View>
      <View style={[styles.volumeTrack, { backgroundColor: `${colors.textMuted}14` }]}>
        {MUSIC_VOLUME_PRESETS.map((preset) => {
          const active = value === preset;
          return (
            <Pressable
              key={preset}
              style={[
                styles.volumeSegment,
                active && { backgroundColor: tint },
              ]}
              onPress={() => onChange(preset)}
            >
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  fontWeight: active ? '700' : '500',
                  color: active ? '#fff' : colors.textSecondary,
                }}
              >
                {Math.round(preset * 100)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  topActions: {
    gap: 6,
    paddingBottom: 2,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  trackIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackMeta: { flex: 1, minWidth: 0, gap: 2 },
  trackTitle: { fontSize: 14 },
  rangeHint: { fontSize: 11, textAlign: 'center' },
  volumeBlock: { gap: 6 },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeTrack: {
    flexDirection: 'row',
    borderRadius: radius.full,
    padding: 3,
    gap: 2,
  },
  volumeSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: radius.full,
  },
});
