import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { asGradientColors, themedAlphaHex } from '@/lib/ui/gradientColors';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { Text } from '@/components/ui/Text';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileAvatarProps = {
  username: string;
  avatarUrl: string | null;
  size?: number;
  isPremium?: boolean;
  isVerified?: boolean;
  isBusinessVerified?: boolean;
  displayInitial?: string;
  isDeleted?: boolean;
  /** İşletme logosu tam görünsün diye contain kullanılır */
  imageFit?: 'cover' | 'contain';
  onPress?: () => void;
};

export const ProfileAvatar = memo(function ProfileAvatar({
  username,
  avatarUrl,
  size = 80,
  isPremium = false,
  isVerified = false,
  isBusinessVerified = false,
  displayInitial,
  isDeleted = false,
  imageFit,
  onPress,
}: ProfileAvatarProps) {
  const { colors } = useTheme();
  const initial = (displayInitial ?? username).trim().slice(0, 1).toUpperCase();
  const innerSize = size - 8;
  const fit = imageFit ?? (isBusinessVerified ? 'contain' : 'cover');
  const logoInset = isBusinessVerified && fit === 'contain' ? 5 : 0;
  const imageSize = innerSize - logoInset * 2;
  const ringColors = asGradientColors(
    isPremium || isBusinessVerified
      ? ['#FFB300', '#FF8F00', '#FFB300']
      : isVerified
        ? [colors.primary, colors.accent, colors.primary]
        : [themedAlphaHex(colors.primary, '88'), themedAlphaHex(colors.primary, '44')],
  );

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      {...(onPress ? { onPress, ...getAndroidInstantPressableProps() } : {})}
      style={[styles.wrapper, { width: size, height: size }]}
    >
      <SafeLinearGradient colors={ringColors} style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]} />
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: colors.surface,
            zIndex: 1,
          },
        ]}
      >
        {isDeleted ? (
          <View
            style={[
              styles.placeholder,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
                backgroundColor: `${colors.danger}18`,
              },
            ]}
          >
            <Ionicons name="person-remove-outline" size={innerSize * 0.42} color={colors.danger} />
          </View>
        ) : avatarUrl ? (
          <OptimizedImage
            uri={avatarUrl}
            tier="avatar"
            layoutWidth={innerSize}
            recyclingKey={avatarUrl}
            contentFit={fit}
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: fit === 'contain' ? 4 : imageSize / 2,
            }}
            transition={0}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
                backgroundColor: `${colors.primary}18`,
              },
            ]}
          >
            <Text variant="h3" style={{ color: colors.primary }}>
              {initial}
            </Text>
          </View>
        )}
      </View>
    </Wrapper>
  );
});

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
