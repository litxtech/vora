import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { openHizmetlerInAppMap } from '@/features/vora-hizmetler/services/mapNavigation';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { RegionId } from '@/constants/regions';

type HizmetQuickActionsProps = {
  regionId?: RegionId | null;
  showMap?: boolean;
  showEmergency?: boolean;
};

export function HizmetQuickActions({
  regionId,
  showMap = false,
  showEmergency = false,
}: HizmetQuickActionsProps) {
  const { colors } = useTheme();

  if (!showMap && !showEmergency) return null;

  return (
    <View style={styles.row}>
      {showMap ? (
        <QuickChip
          icon="map-outline"
          label="Harita"
          colors={colors}
          onPress={() => openHizmetlerInAppMap({ regionId: regionId ?? 'trabzon' })}
        />
      ) : null}
      {showEmergency ? (
        <QuickChip
          icon="flash-outline"
          label="Acil Çağır"
          colors={colors}
          accent="#EF4444"
          onPress={() => router.push('/vora-hizmetler/emergency' as never)}
        />
      ) : null}
    </View>
  );
}

function QuickChip({
  icon,
  label,
  colors,
  accent = VORA_HIZMETLER_ACCENT,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  accent?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: `${accent}40`,
          backgroundColor: `${accent}10`,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={accent} />
      <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
