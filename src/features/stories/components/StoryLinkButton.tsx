import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';
import { spacing } from '@/constants/theme';

type StoryLinkButtonProps = {
  link: StoryLinkManifest;
  onPress?: () => void;
  compact?: boolean;
};

export function StoryLinkButton({ link, onPress, compact = false }: StoryLinkButtonProps) {
  const isGlass = link.backgroundColor.startsWith('rgba');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.root,
        compact && styles.rootCompact,
        {
          backgroundColor: link.backgroundColor,
          opacity: pressed && onPress ? 0.88 : 1,
        },
        isGlass && styles.glass,
      ]}
      accessibilityRole="button"
      accessibilityLabel={link.label}
    >
      <Text
        variant="caption"
        style={[styles.label, { color: link.textColor }, compact && styles.labelCompact]}
        numberOfLines={1}
      >
        {link.label}
      </Text>
      <Ionicons name="arrow-up" size={compact ? 12 : 14} color={link.textColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  rootCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    maxWidth: 220,
  },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  label: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  labelCompact: {
    fontSize: 12,
  },
});
