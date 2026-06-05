import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { MAP_LAYERS } from '@/features/map/constants';
import type { MapLayerId } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapLayerChipsProps = {
  enabledLayers: MapLayerId[];
  counts: Record<MapLayerId, number>;
  onToggle: (layer: MapLayerId) => void;
};

export function MapLayerChips({ enabledLayers, counts, onToggle }: MapLayerChipsProps) {
  const { colors, isDark } = useTheme();

  return (
    <BlurView intensity={isDark ? 20 : 36} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MAP_LAYERS.map((layer) => {
          const active = enabledLayers.includes(layer.id);
          const count = counts[layer.id] ?? 0;

          return (
            <Pressable
              key={layer.id}
              onPress={() => onToggle(layer.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${layer.color}24` : 'rgba(255,255,255,0.05)',
                  borderColor: active ? layer.color : colors.border,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: active ? layer.color : colors.surfaceElevated }]}>
                <Ionicons
                  name={layer.icon as keyof typeof Ionicons.glyphMap}
                  size={13}
                  color={active ? '#fff' : colors.textMuted}
                />
              </View>
              <Text variant="caption" style={{ color: active ? colors.text : colors.textMuted, fontWeight: active ? '600' : '400' }}>
                {layer.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.badge, { backgroundColor: active ? layer.color : colors.surfaceElevated }]}>
                  <Text variant="caption" style={{ color: active ? '#fff' : colors.textMuted, fontSize: 11 }}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingRight: spacing.sm + 2,
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
});
