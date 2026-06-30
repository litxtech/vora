import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MAP_STYLE_OPTIONS } from '@/features/map/constants';
import type { MapStyleId } from '@/features/map/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapStyleIndicatorProps = {
  mapStyle: MapStyleId;
  onPress: () => void;
};

export function MapStyleIndicator({ mapStyle, onPress }: MapStyleIndicatorProps) {
  const { colors } = useTheme();
  const styleOption = MAP_STYLE_OPTIONS.find((option) => option.id === mapStyle) ?? MAP_STYLE_OPTIONS[0];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Harita stili: ${styleOption.label}`}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.72 : 1 }]}
    >
      <Ionicons
        name={styleOption.icon as keyof typeof Ionicons.glyphMap}
        size={13}
        color={colors.textMuted}
      />
      <Text variant="caption" numberOfLines={1} style={[styles.label, { color: colors.textMuted }]}>
        {styleOption.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: spacing.xs,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
  },
});
