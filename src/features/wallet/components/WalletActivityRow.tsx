import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { walletActivityPath } from '@/features/wallet/constants';
import type { WalletActivityItem } from '@/features/wallet/types';
import { formatWalletRelativeTime } from '@/features/wallet/utils';
import {
  formatActivityAmount,
  WALLET_ACTIVITY_STATUS_LABELS,
  WALLET_SECTOR_META,
} from '@/features/wallet/utils/activityLabels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  item: WalletActivityItem;
  isLast?: boolean;
};

const STATUS_COLORS = {
  completed: '#43A047',
  pending: '#FFB300',
  scheduled: '#1E88E5',
} as const;

export function WalletActivityRow({ item, isLast }: Props) {
  const { colors } = useTheme();
  const sector = WALLET_SECTOR_META[item.sector];
  const isCredit =
    item.currency === 'points'
      ? (item.pointsAmount ?? 0) >= 0
      : (item.amountCents ?? 0) >= 0;
  const amountColor = item.currency === 'points' ? sector.accent : isCredit ? colors.success : colors.danger;
  const statusColor = STATUS_COLORS[item.status];
  const showStatus = item.currency === 'try' && item.status !== 'completed';

  return (
    <Pressable
      onPress={() => router.push(walletActivityPath(item.id) as never)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.88 : 1 },
        isLast && styles.rowLast,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: `${sector.accent}18` }]}>
        <Ionicons name={sector.icon} size={17} color={sector.accent} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="label" numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <View style={[styles.sectorPill, { backgroundColor: `${sector.accent}14` }]}>
            <Text variant="caption" style={[styles.sectorText, { color: sector.accent }]}>
              {sector.label}
            </Text>
          </View>
        </View>
        <Text variant="caption" secondary numberOfLines={2}>
          {item.subtitle}
        </Text>
        {showStatus ? (
          <View style={[styles.statusChip, { backgroundColor: `${statusColor}18` }]}>
            <Ionicons name="time-outline" size={10} color={statusColor} />
            <Text variant="caption" style={{ color: statusColor, fontWeight: '600', fontSize: 10 }}>
              {WALLET_ACTIVITY_STATUS_LABELS[item.status]}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.trailing}>
        <Text
          variant="label"
          style={[styles.amount, { color: amountColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {formatActivityAmount(item)}
        </Text>
        <Text variant="caption" secondary>
          {formatWalletRelativeTime(item.occurredAt)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
  },
  sectorPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  sectorText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    minWidth: 72,
    maxWidth: 112,
    flexShrink: 0,
  },
  amount: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    width: '100%',
  },
});
