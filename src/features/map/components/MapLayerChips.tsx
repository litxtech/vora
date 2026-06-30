import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MAP_LAYER_CHIP_HEIGHT, MAP_LAYERS } from '@/features/map/constants';
import { MAP_FEATURE } from '@/features/map/featureFlags';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapLayerChipsProps = {
  enabledLayers: MapLayerId[];
  counts: Record<MapLayerId, number>;
  onToggle: (layer: MapLayerId) => void;
  onLayerNavigate?: (layer: MapLayerId) => void;
};

function LayerChip({
  active,
  color,
  icon,
  label,
  count,
  onPress,
  onLongPress,
  onCountPress,
  isDark,
  surfaceBorder,
  surfaceBackground,
  textMuted,
  textColor,
}: {
  active: boolean;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  onPress: () => void;
  onLongPress?: () => void;
  onCountPress?: () => void;
  isDark: boolean;
  surfaceBorder: string;
  surfaceBackground: string;
  textMuted: string;
  textColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          opacity: pressed ? 0.86 : 1,
          backgroundColor: active
            ? `${color}28`
            : isDark
              ? surfaceBackground
              : 'rgba(255, 255, 255, 0.92)',
          borderColor: active ? color : surfaceBorder,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={active ? color : textMuted} />
      <Text
        variant="caption"
        numberOfLines={1}
        style={[styles.chipLabel, { color: active ? textColor : textMuted }]}
      >
        {label}
      </Text>
      {count > 0 ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onCountPress?.();
          }}
          disabled={!onCountPress}
          hitSlop={6}
          style={[styles.countPill, { backgroundColor: active ? color : 'rgba(120, 120, 128, 0.75)' }]}
        >
          <Text variant="caption" style={styles.countText}>
            {count > 99 ? '99+' : count}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function MapLayerChips({ enabledLayers, counts, onToggle, onLayerNavigate }: MapLayerChipsProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];
  const { isVisible } = useFeatureFlags();

  const visibleLayers = MAP_LAYERS.filter((layer) => isVisible(MAP_FEATURE.layer(layer.id)));

  if (visibleLayers.length === 0) return null;

  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.row}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces
    >
      {visibleLayers.map((layer) => {
        const active = enabledLayers.includes(layer.id);
        const count = counts[layer.id] ?? 0;

        return (
          <LayerChip
            key={layer.id}
            active={active}
            color={layer.color}
            icon={layer.icon as keyof typeof Ionicons.glyphMap}
            label={layer.label}
            count={count}
            onPress={() => onToggle(layer.id)}
            onLongPress={
              layer.id === 'incidents' && onLayerNavigate ? () => onLayerNavigate(layer.id) : undefined
            }
            onCountPress={
              layer.id === 'incidents' && count > 0 && onLayerNavigate
                ? () => onLayerNavigate(layer.id)
                : undefined
            }
            isDark={isDark}
            surfaceBorder={surface.border}
            surfaceBackground={surface.background}
            textMuted={colors.textMuted}
            textColor={colors.text}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginHorizontal: -spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: MAP_LAYER_CHIP_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 88,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
