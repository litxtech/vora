import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  STORY_RING_ACTIVE_GRADIENT,
  STORY_RING_AVATAR_SIZE,
  STORY_RING_SEEN_DARK,
  STORY_RING_SEEN_LIGHT,
} from '@/features/stories/constants';
import { useTheme } from '@/providers/ThemeProvider';

const RING_WIDTH = 2.5;
const GAP = 2;

export type StoryRingVariant = 'none' | 'active' | 'seen' | 'add';

type StoryRingFrameProps = {
  avatarUrl: string | null;
  variant: StoryRingVariant;
  size?: number;
};

export function StoryRingFrame({
  avatarUrl,
  variant,
  size = STORY_RING_AVATAR_SIZE,
}: StoryRingFrameProps) {
  const { colors, isDark } = useTheme();
  const innerShell = size - RING_WIDTH * 2;
  const imageSize = innerShell - GAP * 2;
  const seenColor = isDark ? STORY_RING_SEEN_DARK : STORY_RING_SEEN_LIGHT;

  const avatar = (
    <View
      style={[
        styles.imageClip,
        {
          width: imageSize,
          height: imageSize,
          borderRadius: imageSize / 2,
          backgroundColor: colors.surface,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="person" size={imageSize * 0.4} color={colors.primary} />
        </View>
      )}
    </View>
  );

  if (variant === 'add') {
    return (
      <View
        style={[
          styles.addRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        <Ionicons name="add" size={28} color={colors.primary} />
      </View>
    );
  }

  if (variant === 'none') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Ionicons name="person" size={size * 0.4} color={colors.primary} />
          </View>
        )}
      </View>
    );
  }

  if (variant === 'seen') {
    return (
      <View
        style={[
          styles.seenRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: seenColor,
            backgroundColor: colors.background,
          },
        ]}
      >
        {avatar}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...STORY_RING_ACTIVE_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: RING_WIDTH }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: innerShell / 2,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: GAP,
        }}
      >
        {avatar}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  imageClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRing: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seenRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
