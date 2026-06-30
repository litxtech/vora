import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LOST_CENTER_DEF,
  LOST_CATEGORY_COLORS,
  lostCategoryIcon,
} from '@/features/lost-found/constants';
import type { LostItemCategory } from '@/features/lost-found/types';
import { useTheme } from '@/providers/ThemeProvider';

type LostItemAvatarProps = {
  imageUrl: string | null;
  size?: number;
  category?: LostItemCategory | string;
  urgent?: boolean;
};

export function LostItemAvatar({
  imageUrl,
  size = 48,
  category = 'other',
  urgent = false,
}: LostItemAvatarProps) {
  const { colors } = useTheme();
  const accentColor =
    category in LOST_CATEGORY_COLORS
      ? LOST_CATEGORY_COLORS[category as LostItemCategory]
      : LOST_CENTER_DEF.accent;
  const icon = lostCategoryIcon(category) as keyof typeof Ionicons.glyphMap;
  const radius = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: urgent ? colors.danger : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: radius }} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${accentColor}14` }]}>
            <Ionicons name={icon} size={size * 0.4} color={accentColor} />
          </View>
        )}
      </View>
      {urgent ? (
        <View style={[styles.urgentDot, { borderColor: colors.background, backgroundColor: colors.danger }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  avatar: {
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
