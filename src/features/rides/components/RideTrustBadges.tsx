import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { RIDES_ACCENT } from '@/features/rides/constants';
import type { RideTrustBadges } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';

type Badge = { key: keyof RideTrustBadges; label: string; icon: keyof typeof Ionicons.glyphMap };

const BADGES: Badge[] = [
  { key: 'phoneVerified', label: 'Telefon doğrulandı', icon: 'call-outline' },
  { key: 'emailVerified', label: 'E-posta doğrulandı', icon: 'mail-outline' },
  { key: 'identityVerified', label: 'Kimlik doğrulandı', icon: 'id-card-outline' },
  { key: 'licenseVerified', label: 'Ehliyet doğrulandı', icon: 'card-outline' },
  { key: 'vehicleVerified', label: 'Araç doğrulandı', icon: 'car-outline' },
];

type Props = {
  badges: RideTrustBadges;
  compact?: boolean;
};

export function RideTrustBadges({ badges, compact }: Props) {
  const active = BADGES.filter((b) => badges[b.key]);
  if (!active.length) return null;

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      {active.map((b) => (
        <View key={b.key} style={styles.row}>
          <Ionicons name="checkmark-circle" size={compact ? 14 : 16} color="#43A047" />
          {!compact ? (
            <Text variant="caption" style={styles.label}>
              {b.label}
            </Text>
          ) : null}
        </View>
      ))}
      {compact ? (
        <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
          {active.length}/5 doğrulama
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(67, 160, 71, 0.08)',
  },
  compact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { fontWeight: '600' },
});
