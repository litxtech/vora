import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import type { RegionId } from '@/constants/regions';
import { REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  regionId: RegionId | null;
  onSelect: (regionId: RegionId | null) => void;
  /** Harita üzerine bindirilmiş açık-koyu varyant */
  overlay?: boolean;
};

const OVERLAY_ACCENT = '#fff';

export function IncidentRegionChips({ regionId, onSelect, overlay = false }: Props) {
  const { colors } = useTheme();

  const chipStyle = (active: boolean) =>
    overlay
      ? [
          styles.filterChip,
          styles.overlayChip,
          {
            backgroundColor: active ? 'rgba(255,255,255,0.92)' : 'rgba(10,14,20,0.55)',
            borderColor: active ? '#fff' : 'rgba(255,255,255,0.22)',
          },
        ]
      : [
          styles.filterChip,
          {
            backgroundColor: active ? `${colors.danger}20` : colors.surfaceElevated,
            borderColor: active ? colors.danger : colors.border,
          },
        ];

  const iconColor = (active: boolean) =>
    overlay
      ? active
        ? '#0A0E14'
        : 'rgba(255,255,255,0.82)'
      : active
        ? colors.danger
        : colors.textMuted;

  const chipTextStyle = (active: boolean) => ({
    color: overlay ? (active ? '#0A0E14' : OVERLAY_ACCENT) : active ? colors.danger : colors.text,
    fontWeight: '700' as const,
  });

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable onPress={() => onSelect(null)} style={chipStyle(!regionId)}>
          <Ionicons name="earth-outline" size={13} color={iconColor(!regionId)} />
          <Text variant="caption" style={chipTextStyle(!regionId)}>
            Karadeniz Geneli
          </Text>
        </Pressable>
        {REGIONS.map((region) => {
          const active = regionId === region.id;
          return (
            <Pressable key={region.id} onPress={() => onSelect(region.id)} style={chipStyle(active)}>
              <Ionicons name="location-outline" size={13} color={iconColor(active)} />
              <Text variant="caption" style={chipTextStyle(active)}>
                {region.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  overlayChip: {
    paddingVertical: 6,
  },
});
