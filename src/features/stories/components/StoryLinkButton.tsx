import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { storyLinkWithAlpha } from '@/features/stories/constants/storyLinkColors';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';

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
          borderColor: isGlass
            ? 'rgba(255,255,255,0.45)'
            : storyLinkWithAlpha(link.textColor, 0.24),
          shadowColor: isGlass ? '#000' : link.backgroundColor,
          opacity: pressed && onPress ? 0.9 : 1,
          transform: pressed && onPress ? [{ scale: 0.97 }] : undefined,
        },
        isGlass ? styles.glass : styles.solid,
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
      <Ionicons name="open-outline" size={compact ? 13 : 15} color={link.textColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: 260,
    borderWidth: 1.5,
  },
  solid: {
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 10,
    elevation: 5,
  },
  rootCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    maxWidth: 220,
  },
  glass: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
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
