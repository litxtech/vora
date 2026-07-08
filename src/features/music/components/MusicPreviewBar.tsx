import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { AudioCatalogItem } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicPreviewBarProps = {
  track: AudioCatalogItem;
  bottomInset: number;
  onTogglePreview: () => void;
  onOpen: () => void;
  actionLabel?: string;
};

export function MusicPreviewBar({
  track,
  bottomInset,
  onTogglePreview,
  onOpen,
  actionLabel = 'Aç',
}: MusicPreviewBarProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.bar,
        {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: `${colors.primary}33`,
          paddingBottom: bottomInset + spacing.sm,
        },
      ]}
      onPress={onOpen}
    >
      <Pressable
        style={[styles.playBtn, { backgroundColor: colors.primary }]}
        onPress={(event) => {
          event.stopPropagation();
          onTogglePreview();
        }}
      >
        <Ionicons name="pause" size={18} color="#fff" />
      </Pressable>

      {track.coverUrl ? (
        <Image source={{ uri: track.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverFallback, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="musical-note" size={16} color={colors.primary} />
        </View>
      )}

      <View style={styles.meta}>
        <Text variant="label" numberOfLines={1}>
          {track.displayTitle}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {track.artist || 'Bilinmeyen sanatçı'}
        </Text>
      </View>

      <View style={[styles.actionBtn, { backgroundColor: colors.accent }]}>
        <Text variant="caption" style={styles.actionText}>
          {actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
