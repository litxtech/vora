import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StoryRingFrame } from '@/features/stories/components/StoryRingFrame';
import { STORY_RING_AVATAR_SIZE } from '@/features/stories/constants';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryRingAvatarProps = {
  label: string;
  avatarUrl: string | null;
  hasStory?: boolean;
  hasUnseen?: boolean;
  isOwn?: boolean;
  onPress: () => void;
  onAddPress?: () => void;
};

function resolveRingVariant(
  hasStory: boolean,
  hasUnseen: boolean,
  isOwn: boolean,
): 'none' | 'active' | 'seen' | 'add' {
  if (isOwn && !hasStory) return 'add';
  if (!hasStory) return 'none';
  if (hasUnseen || isOwn) return 'active';
  return 'seen';
}

export function StoryRingAvatar({
  label,
  avatarUrl,
  hasStory = false,
  hasUnseen = false,
  isOwn = false,
  onPress,
  onAddPress,
}: StoryRingAvatarProps) {
  const { colors } = useTheme();
  const variant = resolveRingVariant(hasStory, hasUnseen, isOwn);

  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <View>
        <StoryRingFrame avatarUrl={avatarUrl} variant={variant} />
        {isOwn && hasStory && onAddPress ? (
          <Pressable
            style={[styles.plusBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}
            onPress={onAddPress}
            hitSlop={8}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>
      <Text variant="caption" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const size = STORY_RING_AVATAR_SIZE;

const styles = StyleSheet.create({
  wrap: {
    width: size + 8,
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    maxWidth: size + 8,
    textAlign: 'center',
    fontSize: 11,
  },
  plusBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
