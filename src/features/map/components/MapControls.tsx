import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { MAP_STYLE_OPTIONS, NEARBY_RADIUS_KM } from '@/features/map/constants';
import type { MapStyleId } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapControlsProps = {
  onRecenter: () => void;
  onRefresh: () => void;
  onToggleNearby: () => void;
  onCycleMapStyle: () => void;
  refreshing?: boolean;
  nearbyEnabled?: boolean;
  mapStyle: MapStyleId;
  providerLabel: string;
};

export function MapControls({
  onRecenter,
  onRefresh,
  onToggleNearby,
  onCycleMapStyle,
  refreshing,
  nearbyEnabled,
  mapStyle,
  providerLabel,
}: MapControlsProps) {
  const { colors, isDark } = useTheme();
  const styleOption = MAP_STYLE_OPTIONS.find((option) => option.id === mapStyle) ?? MAP_STYLE_OPTIONS[0];

  return (
    <View style={styles.wrap}>
      <BlurView intensity={isDark ? 24 : 40} tint={isDark ? 'dark' : 'light'} style={styles.cluster}>
        <Pressable style={styles.btn} onPress={onRecenter} accessibilityLabel="Konumuma git">
          <Ionicons name="locate" size={22} color={colors.primary} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable
          style={[styles.btn, nearbyEnabled && styles.btnActive]}
          onPress={onToggleNearby}
          accessibilityLabel="Yakınımda"
        >
          <Ionicons name="radio-outline" size={22} color={nearbyEnabled ? colors.accent : colors.primary} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable style={styles.btn} onPress={onCycleMapStyle} accessibilityLabel="Harita stili">
          <Ionicons
            name={styleOption.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={colors.primary}
          />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable style={styles.btn} onPress={onRefresh} disabled={refreshing} accessibilityLabel="Yenile">
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={colors.primary} />
          )}
        </Pressable>
      </BlurView>

      <View style={[styles.meta, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Ionicons name="map-outline" size={12} color={colors.accent} />
        <Text variant="caption" muted style={styles.metaText}>
          {providerLabel} · {styleOption.label}
          {nearbyEnabled ? ` · ${NEARBY_RADIUS_KM} km` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  cluster: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnActive: {
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 220,
  },
  metaText: {
    fontSize: 11,
    flexShrink: 1,
  },
});
