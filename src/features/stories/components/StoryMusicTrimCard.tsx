import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MusicRangeTrimSlider } from '@/features/music/components/MusicRangeTrimSlider';
import { MusicTrimSlider } from '@/features/music/components/MusicTrimSlider';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import type { MusicSelection } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';

type StoryMusicTrimCardProps = {
  music: MusicSelection;
  mediaType: 'image' | 'video';
  clipDurationSec: number;
  onStartChange: (sec: number) => void;
  onRangeChange: (startSec: number, endSec: number) => void;
  onChangeTrack: () => void;
  onRemove: () => void;
  onDone: () => void;
};

/** Hikâye önizlemesi üzerinde küçük müzik kırpma kartı */
export function StoryMusicTrimCard({
  music,
  mediaType,
  clipDurationSec,
  onStartChange,
  onRangeChange,
  onChangeTrack,
  onRemove,
  onDone,
}: StoryMusicTrimCardProps) {
  const clipSec = Math.max(0.5, music.musicEndSec - music.musicStartSec);

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Ionicons name="musical-notes" size={15} color="#c4b5fd" />
          <Text variant="caption" style={styles.title} numberOfLines={1}>
            {music.displayTitle}
          </Text>
          <Pressable onPress={onChangeTrack} hitSlop={8} style={styles.miniBtn}>
            <Ionicons name="swap-horizontal" size={16} color="#fff" />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8} style={styles.miniBtn}>
            <Ionicons name="close" size={18} color="#fca5a5" />
          </Pressable>
        </View>

        {mediaType === 'video' ? (
          <MusicTrimSlider
            trackDurationSec={music.durationSec}
            clipDurationSec={clipDurationSec}
            startSec={music.musicStartSec}
            onStartChange={onStartChange}
          />
        ) : (
          <MusicRangeTrimSlider
            trackDurationSec={music.durationSec}
            startSec={music.musicStartSec}
            endSec={music.musicEndSec}
            onRangeChange={onRangeChange}
          />
        )}

        <Text variant="caption" style={styles.hint}>
          {mediaType === 'video'
            ? `${formatMusicDuration(clipDurationSec)} · kaydır`
            : `${formatMusicDuration(clipSec)} · tutamaçları kaydır`}
        </Text>

        <Pressable style={styles.doneBtn} onPress={onDone}>
          <Text variant="caption" style={styles.doneBtnText}>
            Tamam
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.sm,
    padding: spacing.sm,
    paddingTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(8,8,12,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  miniBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    textAlign: 'center',
  },
  doneBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: '#7c3aed',
    minWidth: 120,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
