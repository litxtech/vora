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
import type { AudioSource, MusicTrack } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicTrackRowProps = {
  track: MusicTrack & { source?: AudioSource };
  active?: boolean;
  previewing?: boolean;
  saved?: boolean;
  showSourceBadge?: boolean;
  onPress?: () => void;
  onPreview?: () => void;
  onUse?: () => void;
  onToggleSave?: () => void;
};

export function MusicTrackRow({
  track,
  active,
  previewing,
  saved,
  showSourceBadge,
  onPress,
  onPreview,
  onUse,
  onToggleSave,
}: MusicTrackRowProps) {
  const { colors } = useTheme();
  const playable = isMusicTrackPlayable(track.audioUrl);
  const rotation = useSharedValue(0);
  const source = track.source;

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
          borderColor: active ? colors.accent : 'transparent',
          backgroundColor: previewing ? `${colors.primary}12` : `${colors.textMuted}0D`,
        },
        previewing && styles.cardPlaying,
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
        <View style={styles.titleRow}>
          <Text variant="label" numberOfLines={1} style={styles.title}>
            {track.displayTitle}
          </Text>
          {showSourceBadge && source === 'sound' ? (
            <View style={[styles.sourceBadge, { backgroundColor: `${colors.accent}22` }]}>
              <Text variant="caption" style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }}>
                Ses
              </Text>
            </View>
          ) : null}
        </View>
        <Text secondary variant="caption" numberOfLines={1}>
          {track.artist || 'Bilinmeyen sanatçı'}
        </Text>
        <Text secondary variant="caption">
          {formatMusicDuration(track.durationSec)}
          {track.usageCount > 0 ? ` · ${track.usageCount.toLocaleString('tr-TR')} kullanım` : ''}
        </Text>
      </View>

      {onToggleSave ? (
        <Pressable onPress={onToggleSave} hitSlop={8} style={styles.iconAction}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? colors.accent : colors.textSecondary}
          />
        </Pressable>
      ) : null}

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
      ) : (
        <View style={styles.iconAction}>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      )}
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
    borderWidth: 1.5,
    marginBottom: spacing.xs,
  },
  cardPlaying: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontWeight: '700',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  iconAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
