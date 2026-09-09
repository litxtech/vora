import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { Text } from '@/components/ui/Text';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { asGradientColors } from '@/lib/ui/gradientColors';
import { useTheme } from '@/providers/ThemeProvider';

const OUTER_SIZE = 38;
const RING_WIDTH = 2.5;
const GAP = 1.5;
const INNER_SHELL = OUTER_SIZE - RING_WIDTH * 2;
const IMAGE_SIZE = INNER_SHELL - GAP * 2;

type FeedHeaderAvatarRingProps = {
  avatarUrl: string | null;
  username: string;
  active?: boolean;
};

export function FeedHeaderAvatarRing({
  avatarUrl,
  username,
  active = false,
}: FeedHeaderAvatarRingProps) {
  const { colors } = useTheme();
  const sanitizedUrl = sanitizeAvatarUrl(avatarUrl);
  const initial = username.slice(0, 1).toUpperCase();

  const ringColors = active
    ? [colors.accent, colors.primary, colors.accent]
    : [colors.primary, colors.accent, colors.primary];

  return (
    <SafeLinearGradient
      colors={asGradientColors(ringColors)}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.ring,
        {
          width: OUTER_SIZE,
          height: OUTER_SIZE,
          borderRadius: OUTER_SIZE / 2,
          padding: RING_WIDTH,
        },
        active && styles.ringActive,
      ]}
    >
      <View
        style={[
          styles.shell,
          {
            borderRadius: INNER_SHELL / 2,
            backgroundColor: colors.background,
            padding: GAP,
          },
        ]}
      >
        <View
          style={[
            styles.avatarClip,
            {
              width: IMAGE_SIZE,
              height: IMAGE_SIZE,
              borderRadius: IMAGE_SIZE / 2,
              backgroundColor: sanitizedUrl ? colors.surface : `${colors.primary}18`,
            },
          ]}
        >
          {sanitizedUrl ? (
            <Image
              source={{ uri: sanitizedUrl }}
              style={{ width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 }}
              contentFit="cover"
            />
          ) : username ? (
            <Text variant="caption" style={[styles.initial, { color: colors.primary }]}>
              {initial}
            </Text>
          ) : (
            <Ionicons name="person-outline" size={IMAGE_SIZE * 0.48} color={colors.primary} />
          )}
        </View>
      </View>
    </SafeLinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: {
    flexShrink: 0,
  },
  ringActive: {
    transform: [{ scale: 1.04 }],
  },
  shell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
});
