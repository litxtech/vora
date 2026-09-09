import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { formatCapUsageCount } from '@/features/caps/constants';
import type { Cap } from '@/features/caps/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CapGridItemProps = {
  cap: Cap;
  onPress: (cap: Cap) => void;
  onLongPress?: (cap: Cap) => void;
  selected?: boolean;
  showCreator?: boolean;
  showUsage?: boolean;
};

export const CapGridItem = memo(function CapGridItem({
  cap,
  onPress,
  onLongPress,
  selected = false,
  showCreator = true,
  showUsage = true,
}: CapGridItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(cap)}
      onLongPress={onLongPress ? () => onLongPress(cap) : undefined}
      style={[
        styles.card,
        selected ? { opacity: 0.85 } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={cap.title ?? `Caps ${cap.creator?.username ?? ''}`}
    >
      <View style={styles.mediaWrap}>
        <Image
          source={{ uri: cap.thumbUrl ?? cap.imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={100}
        />
        {cap.videoUrl ? (
          <View style={styles.videoBadge}>
            <Ionicons name="play" size={12} color="#fff" />
          </View>
        ) : null}
      </View>
      {showCreator && cap.creator ? (
        <View style={styles.meta}>
          <ProfileAvatar
            username={cap.creator.username}
            avatarUrl={cap.creator.avatarUrl}
            size={22}
          />
          <Text variant="caption" secondary numberOfLines={1} style={styles.username}>
            @{cap.creator.username}
          </Text>
        </View>
      ) : null}
      {showUsage ? (
        <Text variant="caption" secondary numberOfLines={1} style={styles.usage}>
          {formatCapUsageCount(cap.uniqueUserCount)}
        </Text>
      ) : null}
      {cap.inLibrary ? (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: spacing.xs,
    gap: 4,
    minHeight: 156,
  },
  mediaWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'transparent',
    overflow: 'visible',
    borderWidth: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    flex: 1,
    fontSize: 11,
  },
  usage: {
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
