import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  describeAdWalletEntry,
  formatAdWalletLedgerAmount,
  formatAdWalletRelativeDate,
} from '@/features/ads/constants/adWalletLabels';
import { formatWalletBalance } from '@/features/ads/services/adBilling';
import type { AdWalletLedgerEntry } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  entries: AdWalletLedgerEntry[];
  loading?: boolean;
};

const ACCENT = '#7C3AED';

export function AdWalletActivityFeed({ entries, loading = false }: Props) {
  const { colors } = useTheme();

  return (
    <GlassCard padded={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="label">Cüzdan hareketleri</Text>
          <Text secondary variant="caption">
            Yüklemeler ve reklam tıklama harcamaları
          </Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: `${ACCENT}14` }]}>
          <Ionicons name="receipt-outline" size={16} color={ACCENT} />
        </View>
      </View>

      {loading ? (
        <Text secondary variant="caption" style={styles.empty}>
          Hareketler yükleniyor…
        </Text>
      ) : entries.length === 0 ? (
        <Text secondary variant="caption" style={styles.empty}>
          Henüz hareket yok. Bakiye yüklediğinizde ve reklam tıklaması gerçekleştiğinde burada görünür.
        </Text>
      ) : (
        entries.map((entry, index) => {
          const copy = describeAdWalletEntry(entry);
          const isCredit = entry.amountCents > 0;
          const amountColor = isCredit ? colors.success : colors.danger;

          return (
            <View
              key={entry.id}
              style={[
                styles.row,
                { borderBottomColor: colors.border },
                index === entries.length - 1 && styles.rowLast,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: `${amountColor}14` }]}>
                <Ionicons name={copy.icon} size={17} color={amountColor} />
              </View>

              <View style={styles.body}>
                <Text variant="label" numberOfLines={1} style={styles.title}>
                  {copy.title}
                </Text>
                <Text variant="caption" secondary numberOfLines={2}>
                  {copy.subtitle}
                </Text>
                <Text variant="caption" secondary style={styles.meta}>
                  Bakiye: {formatWalletBalance(entry.balanceAfterCents)} ·{' '}
                  {formatAdWalletRelativeDate(entry.createdAt)}
                </Text>
              </View>

              <View style={styles.trailing}>
                <Text variant="label" style={{ color: amountColor, fontWeight: '700' }}>
                  {formatAdWalletLedgerAmount(entry.amountCents)}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.md,
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
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
  },
  meta: {
    fontSize: 10,
    marginTop: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    paddingTop: 2,
    minWidth: 72,
  },
});
