import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { STORY_RING_AVATAR_SIZE } from '@/features/stories/constants';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STORY_GRADIENT = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888'];

type StoryRingAvatarProps = {
  label: string;
  avatarUrl: string | null;
  /** Kullanıcının aktif hikayesi var */
  hasStory?: boolean;
  /** İzlenmemiş hikaye — renkli halka */
  hasUnseen?: boolean;
  isOwn?: boolean;
  onPress: () => void;
  onAddPress?: () => void;
};

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
  const innerSize = size - 6;

  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <View>
        {isOwn && !hasStory ? (
          <View style={[styles.addRing, { borderColor: colors.border }]}>
            <View style={[styles.addInner, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </View>
          </View>
        ) : (
          <View style={[styles.ringShell, { width: size, height: size }]}>
            {hasStory && hasUnseen ? (
              <SafeLinearGradient
                colors={STORY_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradientRing, { width: size, height: size, borderRadius: size / 2 }]}
              />
            ) : hasStory ? (
              <View style={[styles.seenRing, { borderColor: colors.textMuted }]} />
            ) : null}
            <View style={[styles.avatarClip, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="person" size={innerSize * 0.42} color={colors.textMuted} />
                </View>
              )}
            </View>
          </View>
        )}
        {isOwn && hasStory && onAddPress ? (
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
  ringShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRing: {
    position: 'absolute',
  },
  seenRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: size / 2,
    borderWidth: 2,
  },
  avatarClip: {
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
