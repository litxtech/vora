import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { Text } from '@/components/ui/Text';
import {
  authorPublicName,
  BUSINESS_VERIFIED_RING,
} from '@/features/profile/services/businessIdentity';
import type { FeedAuthor } from '@/features/feed/types';
import { radius } from '@/constants/theme';
import { asGradientColors, themedAlphaHex } from '@/lib/ui/gradientColors';
import { useTheme } from '@/providers/ThemeProvider';

type AuthorLike = Pick<
  FeedAuthor,
  'avatarUrl' | 'isVerified' | 'isBusinessVerified' | 'username' | 'fullName' | 'displayName'
>;

type Props = {
  author: AuthorLike;
  size?: number;
  showRing?: boolean;
  style?: StyleProp<ViewStyle>;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackIconColor?: string;
};

const LOGO_INSET = 5;

export const FeedAuthorAvatar = memo(function FeedAuthorAvatar({
  author,
  size = 40,
  showRing = true,
  style,
  fallbackIcon,
  fallbackIconColor,
}: Props) {
  const { colors } = useTheme();
  const ringPadding = 2;
  const outerSize = size + ringPadding * 2;
  const isBusiness = Boolean(author.isBusinessVerified);
  const displayName = authorPublicName(author);
  const initial = displayName.slice(0, 1).toUpperCase();
  const imageFit = isBusiness ? 'contain' : 'cover';
  const imageSize = isBusiness ? size - LOGO_INSET * 2 : size;

  return (
    <View style={[styles.wrap, { width: outerSize, height: outerSize }, style]}>
      {showRing && author.isBusinessVerified ? (
        <SafeLinearGradient
          colors={asGradientColors(BUSINESS_VERIFIED_RING)}
          style={[styles.ring, { width: outerSize, height: outerSize, borderRadius: outerSize / 2 }]}
        />
      ) : showRing && author.isVerified ? (
        <SafeLinearGradient
          colors={asGradientColors([colors.primary, colors.accent])}
          style={[styles.ring, { width: outerSize, height: outerSize, borderRadius: outerSize / 2 }]}
        />
      ) : null}
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isBusiness ? colors.surface : themedAlphaHex(colors.primary, '18'),
          },
        ]}
      >
        {author.avatarUrl ? (
          <OptimizedImage
            uri={author.avatarUrl}
            tier="avatar"
            layoutWidth={size}
            recyclingKey={author.avatarUrl}
            contentFit={imageFit}
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: isBusiness ? 4 : size / 2,
            }}
            transition={0}
          />
        ) : fallbackIcon ? (
          <Ionicons name={fallbackIcon} size={Math.round(size * 0.45)} color={fallbackIconColor ?? colors.primary} />
        ) : (
          <Text variant="label" style={{ color: colors.primary, fontSize: Math.round(size * 0.38) }}>
            {initial}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ring: {
    position: 'absolute',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
