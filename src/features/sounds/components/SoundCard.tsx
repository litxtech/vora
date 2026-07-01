import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { isSoundPlayable } from '@/features/sounds/constants';
import type { Sound } from '@/features/sounds/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SoundCardProps = {
  sound: Sound;
  playing?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onPreview?: () => void;
  onUse?: () => void;
  compact?: boolean;
};

export function SoundCard({
  sound,
  playing = false,
  selected = false,
  onPress,
  onPreview,
  onUse,
  compact = false,
}: SoundCardProps) {
  const { colors } = useTheme();
  const authorLabel = sound.author?.username ? `@${sound.author.username}` : 'Kullanıcı';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Pressable onPress={onPreview} style={styles.coverWrap}>
        {sound.coverUrl ? (
          <Image source={{ uri: sound.coverUrl }} style={styles.cover} />
        ) : (
          <LinearGradient colors={['#6366f1', '#8b5cf6', '#d946ef']} style={styles.cover}>
            <Ionicons name="musical-notes" size={compact ? 20 : 28} color="#fff" />
          </LinearGradient>
        )}
        {onPreview ? (
          <View style={styles.playBadge}>
            <Ionicons name={playing ? 'pause' : 'play'} size={14} color="#fff" />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.meta}>
        <Text variant="label" numberOfLines={1} style={styles.title}>
          {sound.title}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {authorLabel}
        </Text>
        <Text secondary variant="caption">
          {sound.usageCount.toLocaleString('tr-TR')} kullanım
        </Text>
      </View>

      {onUse ? (
        <Pressable
          onPress={onUse}
          disabled={!isSoundPlayable(sound.audioUrl)}
          style={[styles.useBtn, { backgroundColor: colors.accent }]}
        >
          <Text variant="caption" style={styles.useBtnText}>
            Bu Sesi Kullan
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
  cardCompact: {
    paddingVertical: spacing.xs,
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
