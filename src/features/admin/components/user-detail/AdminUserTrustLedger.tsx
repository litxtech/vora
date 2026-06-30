import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { fetchAdminUserTrustLedger } from '@/features/admin/services/trustScoreManagement';
import { TRUST_SOURCE_LABELS } from '@/features/wallet/constants';
import type { TrustLedgerEntry } from '@/features/wallet/types';
import { formatActivityFullDate } from '@/features/wallet/utils/activityLabels';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminUserTrustLedgerProps = {
  userId: string;
  showHeader?: boolean;
};

export function AdminUserTrustLedger({ userId, showHeader = true }: AdminUserTrustLedgerProps) {
  const { colors } = useTheme();
  const [ledger, setLedger] = useState<TrustLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchAdminUserTrustLedger(userId, 30);
    setLedger(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  return (
    <>
      {showHeader ? (
        <AdminSectionHeader title="Güven puanı hareketleri" hint="Son 30 kayıt" />
      ) : null}
      {loading ? (
        <AdminEmptyState loading />
      ) : ledger.length === 0 ? (
        <AdminEmptyState
          title="Hareket yok"
          message="Bu kullanıcı için kayıtlı güven puanı hareketi bulunamadı."
          icon="trending-up-outline"
        />
      ) : (
        <View style={styles.ledgerWrap}>
          {ledger.map((entry) => (
            <View
              key={entry.id}
              style={[styles.ledgerRow, { borderColor: colors.border, backgroundColor: `${colors.surface}88` }]}
            >
              <View style={styles.ledgerTop}>
                <Text variant="caption" style={{ fontWeight: '700', flex: 1 }}>
                  {entry.sourceType === 'admin_adjust'
                    ? 'Platform düzenlemesi'
                    : (TRUST_SOURCE_LABELS[entry.sourceType] ?? entry.sourceType)}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: entry.appliedDelta >= 0 ? colors.success : colors.danger,
                    fontWeight: '700',
                  }}
                >
                  {entry.appliedDelta >= 0 ? '+' : ''}
                  {entry.appliedDelta} puan
                </Text>
              </View>
              <Text secondary variant="caption" numberOfLines={3}>
                {entry.note ?? '—'}
              </Text>
              <Text secondary variant="caption">
                {entry.scoreBefore} → {entry.scoreAfter} · {formatActivityFullDate(entry.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  ledgerWrap: {
    gap: spacing.sm,
  },
  ledgerRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
  },
  ledgerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
