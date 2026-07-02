import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import { isMusicTrackPlayable } from '@/features/music/constants';
import type { MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicTrackRowProps = {
  track: MusicTrack;
  active?: boolean;
  previewing?: boolean;
  onPress?: () => void;
  onPreview?: () => void;
  onUse?: () => void;
};

export function MusicTrackRow({
  track,
  active,
  previewing,
  onPress,
  onPreview,
  onUse,
}: MusicTrackRowProps) {
  const { colors } = useTheme();
  const playable = isMusicTrackPlayable(track.audioUrl);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (previewing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 4200, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }

    cancelAnimation(rotation);
    rotation.value = withTiming(0, { duration: 180 });
  }, [previewing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Pressable onPress={onPreview} disabled={!playable || !onPreview} style={styles.coverWrap}>
        <Animated.View style={[styles.coverSpin, previewing && spinStyle]}>
          {track.coverUrl ? (
            <Image
              source={{ uri: track.coverUrl }}
              style={[styles.cover, previewing && styles.coverVinyl]}
            />
          ) : (
            <View
              style={[
                styles.cover,
                styles.coverFallback,
                previewing && styles.coverVinyl,
                { backgroundColor: `${colors.primary}14` },
              ]}
            >
              <Ionicons name="musical-note" size={20} color={colors.primary} />
            </View>
          )}
        </Animated.View>
        {onPreview && playable ? (
          <View style={styles.playBadge}>
            <Ionicons name={previewing ? 'pause' : 'play'} size={14} color="#fff" />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.meta}>
        <Text variant="label" numberOfLines={1} style={styles.title}>
          {track.displayTitle}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {track.artist || 'Bilinmeyen sanatçı'}
        </Text>
        <Text secondary variant="caption">
          {formatMusicDuration(track.durationSec)}
          {track.usageCount > 0 ? ` · ${track.usageCount.toLocaleString('tr-TR')} kullanım` : ''}
        </Text>
      </View>

      {onUse ? (
        <Pressable
          onPress={onUse}
          disabled={!playable}
          style={[styles.useBtn, { backgroundColor: playable ? colors.primary : colors.border }]}
        >
          <Text variant="caption" style={styles.useBtnText}>
            Kullan
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  coverWrap: {
    position: 'relative',
  },
  coverSpin: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  coverVinyl: {
    borderRadius: 28,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontWeight: '700',
  },
  useBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  useBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
