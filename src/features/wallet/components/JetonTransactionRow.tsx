import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  formatJeton,
} from '@/features/wallet/constants';
import type { JetonTransaction } from '@/features/wallet/types';
import { describeJetonTransaction } from '@/features/wallet/utils/activityLabels';
import { formatWalletRelativeTime } from '@/features/wallet/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type JetonTransactionRowProps = {
  tx: JetonTransaction;
  showUsername?: string;
  isLast?: boolean;
};

function txIcon(tx: JetonTransaction, isCredit: boolean): keyof typeof Ionicons.glyphMap {
  if (tx.txType === 'task_reward' || tx.txType === 'bonus') return 'trophy';
  if (tx.txType === 'spend') return 'flash';
  if (tx.txType === 'transfer_in' || tx.txType === 'transfer_out') return 'swap-horizontal';
  return isCredit ? 'add-circle' : 'remove-circle';
}

export function JetonTransactionRow({ tx, showUsername, isLast }: JetonTransactionRowProps) {
  const { colors } = useTheme();
  const isCredit = tx.amount > 0;
  const accent = isCredit ? colors.success : colors.danger;
  const { title, subtitle: baseSubtitle } = describeJetonTransaction(tx);
  const subtitle = showUsername ? `@${showUsername} · ${baseSubtitle}` : baseSubtitle;
  const timeLabel = formatWalletRelativeTime(tx.createdAt);

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isLast && styles.rowLast,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={txIcon(tx, isCredit)} size={18} color={accent} />
      </View>
      <View style={styles.info}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" secondary numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.trailing}>
        <Text variant="label" style={{ color: accent, fontWeight: '700' }}>
          {formatJeton(tx.amount)}
        </Text>
        <Text variant="caption" secondary>
          {timeLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
