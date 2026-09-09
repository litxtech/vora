import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MusicRangeTrimSlider } from '@/features/music/components/MusicRangeTrimSlider';
import { MusicTrimSlider } from '@/features/music/components/MusicTrimSlider';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import type { MusicSelection } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';

type StoryMusicStripProps = {
  visible: boolean;
  music: MusicSelection;
  mediaType: 'image' | 'video';
  clipDurationSec: number;
  onStartChange: (sec: number) => void;
  onRangeChange?: (startSec: number, endSec: number) => void;
  onChangeTrack: () => void;
  onRemove: () => void;
  onDone: () => void;
};

function MusicWaveBars() {
  const heights = [10, 16, 8, 14, 6, 12, 9];
  return (
    <View style={styles.waveBars} pointerEvents="none">
      {heights.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveBar,
            {
              height,
              opacity: 0.35 + (index % 3) * 0.15,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Kompakt müzik kırpma kartı — hikâye önizlemesi görünür kalır */
export function StoryMusicStrip({
  visible,
  music,
  mediaType,
  clipDurationSec,
  onStartChange,
  onRangeChange,
  onChangeTrack,
  onRemove,
  onDone,
}: StoryMusicStripProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const clipSec = Math.max(0.5, music.musicEndSec - music.musicStartSec);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <LinearGradient
        colors={['rgba(124,58,237,0.45)', 'rgba(30,136,229,0.25)', 'rgba(255,255,255,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBorder}
      >
        <View style={styles.card}>
          <View style={styles.topRow}>
            <LinearGradient
              colors={['#7c3aed', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.disc}
            >
              <Ionicons name="musical-notes" size={18} color="#fff" />
            </LinearGradient>

            <View style={styles.trackMeta}>
              <Text variant="caption" style={styles.trackEyebrow}>
                Müzik
              </Text>
              <Text variant="label" style={styles.trackTitle} numberOfLines={1}>
                {music.displayTitle}
              </Text>
              {music.artist ? (
                <Text variant="caption" style={styles.trackArtist} numberOfLines={1}>
                  {music.artist}
                </Text>
              ) : null}
            </View>

            <MusicWaveBars />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onChangeTrack} hitSlop={8} style={styles.actionPill}>
              <Ionicons name="swap-horizontal" size={16} color="#fff" />
              <Text variant="caption" style={styles.actionLabel}>
                Değiştir
              </Text>
            </Pressable>
            <Pressable onPress={onRemove} hitSlop={8} style={[styles.actionPill, styles.actionPillDanger]}>
              <Ionicons name="trash-outline" size={16} color="#fca5a5" />
              <Text variant="caption" style={[styles.actionLabel, styles.actionLabelDanger]}>
                Kaldır
              </Text>
            </Pressable>
            <Pressable onPress={onDone} hitSlop={8} style={styles.doneBtn}>
              <LinearGradient
                colors={['#7c3aed', '#5b21b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.doneGradient}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.trimSection}>
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
                onRangeChange={onRangeChange ?? (() => {})}
              />
            )}
          </View>

          <Text variant="caption" style={styles.hint}>
            {mediaType === 'video'
              ? `Videoda ${formatMusicDuration(clipDurationSec)} çalınacak`
              : `${formatMusicDuration(clipSec)} seçildi`}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    zIndex: 80,
    elevation: 80,
  },
  cardBorder: {
    borderRadius: radius.xl + 2,
    padding: 1.5,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(10,10,16,0.94)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  trackEyebrow: {
    color: 'rgba(167,139,250,0.9)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trackTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '600',
  },
  waveBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 18,
    paddingBottom: 2,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionPillDanger: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderColor: 'rgba(248,113,113,0.2)',
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  actionLabelDanger: {
    color: '#fca5a5',
  },
  doneBtn: {
    marginLeft: 'auto',
    borderRadius: 20,
    overflow: 'hidden',
  },
  doneGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimSection: {
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
});
