import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RideRefundContextCard } from '@/features/rides/components/RideRefundContextCard';
import { RideRefundPayoutNote } from '@/features/rides/components/RideRefundPayoutNote';
import { rideCityName, RIDES_ACCENT } from '@/features/rides/constants';
import type { RideRefundContext } from '@/features/rides/services/refundContextData';
import { radius, spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/providers/ThemeProvider';

type RideRefundSummarySectionProps = {
  context: RideRefundContext;
  expanded: boolean;
  onToggle: () => void;
};

export function RideRefundSummarySection({ context, expanded, onToggle }: RideRefundSummarySectionProps) {
  const { colors } = useTheme();
  const route = `${rideCityName(context.trip.fromCityId)} → ${rideCityName(context.trip.toCityId)}`;

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={onToggle}
        style={[styles.bar, { backgroundColor: `${RIDES_ACCENT}10` }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.badge, { backgroundColor: `${RIDES_ACCENT}18` }]}>
          <Ionicons name="ticket-outline" size={14} color={RIDES_ACCENT} />
          <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
            {context.referenceCode}
          </Text>
        </View>
        <Text variant="caption" numberOfLines={1} style={styles.route}>
          {route}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <RideRefundContextCard context={context} />
          <RideRefundPayoutNote />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  route: {
    flex: 1,
    fontWeight: '600',
  },
  details: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
});
