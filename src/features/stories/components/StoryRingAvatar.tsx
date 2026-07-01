import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventLiveAvatar } from '@/features/events/components/EventLiveAvatar';
import { STORY_RING_AVATAR_SIZE } from '@/features/stories/constants';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryRingAvatarProps = {
  label: string;
  coverUrl: string | null;
  hasUnseen: boolean;
  isOwn?: boolean;
  hasOwnStory?: boolean;
  onPress: () => void;
  onAddPress?: () => void;
};

export function StoryRingAvatar({
  label,
  coverUrl,
  hasUnseen,
  isOwn = false,
  hasOwnStory = false,
  onPress,
  onAddPress,
}: StoryRingAvatarProps) {
  const { colors } = useTheme();

  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <View>
        {isOwn && !hasOwnStory ? (
          <View style={[styles.addRing, { borderColor: colors.border }]}>
            <View style={[styles.addInner, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </View>
          </View>
        ) : (
          <EventLiveAvatar
            coverUrl={coverUrl}
            size={STORY_RING_AVATAR_SIZE}
            story={hasUnseen}
            live={false}
          />
        )}
        {isOwn && hasOwnStory && onAddPress ? (
          <Pressable style={[styles.plusBadge, { backgroundColor: colors.primary }]} onPress={onAddPress} hitSlop={8}>
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
  addRing: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInner: {
    width: size - 8,
    height: size - 8,
    borderRadius: (size - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: '#000',
  },
});
