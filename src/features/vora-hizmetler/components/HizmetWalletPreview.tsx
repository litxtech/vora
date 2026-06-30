import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatServicePrice } from '@/features/vora-hizmetler/constants';
import {
  fetchUserHizmetWalletPayments,
  hizmetPaymentWalletStatus,
} from '@/features/vora-hizmetler/services/paymentData';
import { WALLET_ROUTE } from '@/features/wallet/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetWalletPreviewProps = {
  userId: string;
  providerId?: string | null;
};

export function HizmetWalletPreview({ userId, providerId }: HizmetWalletPreviewProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await fetchUserHizmetWalletPayments(userId, providerId, 10);
    let pending = 0;
    let scheduled = 0;
    let completed = 0;
    for (const row of rows) {
      const walletStatus = hizmetPaymentWalletStatus(
        row.status,
        row.payoutDueAt,
        row.payoutCompletedAt,
      );
      const signed = row.direction === 'out' ? -row.amount : row.amount;
      if (walletStatus === 'pending') pending += signed;
      else if (walletStatus === 'scheduled') scheduled += signed;
      else completed += signed;
    }
    setPendingTotal(pending);
    setScheduledTotal(scheduled);
    setCompletedTotal(completed);
    setRecentCount(rows.length);
    setLoading(false);
  }, [userId, providerId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Pressable
      onPress={() => router.push(WALLET_ROUTE as never)}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: '#0EA5E918' }]}>
            <Ionicons name="wallet-outline" size={20} color="#0EA5E9" />
          </View>
          <View style={styles.headerText}>
            <Text variant="label">Cüzdan özeti</Text>
            <Text secondary variant="caption">
              Hizmet ödemeleri uygulama cüzdanında görünür
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        {loading ? (
          <ActivityIndicator color="#0EA5E9" style={{ marginVertical: spacing.sm }} />
        ) : recentCount ? (
          <View style={styles.statsRow}>
            <StatBox
              label="Güvencede"
              value={formatServicePrice(Math.abs(pendingTotal))}
              tone={pendingTotal !== 0 ? 'pending' : 'muted'}
            />
            <StatBox
              label="7 gün içinde"
              value={formatServicePrice(Math.abs(scheduledTotal))}
              tone={scheduledTotal !== 0 ? 'pending' : 'muted'}
            />
            <StatBox
              label="Yatırıldı"
              value={formatServicePrice(Math.abs(completedTotal))}
              tone="success"
            />
          </View>
        ) : (
          <Text secondary variant="caption" style={styles.empty}>
            Henüz hizmet ödemesi yok. Teklif kabul edilince Ödeme Yap butonu açılır.
          </Text>
        )}
      </GlassCard>
    </Pressable>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'pending' | 'success' | 'muted';
}) {
  const color = tone === 'pending' ? '#F59E0B' : tone === 'success' ? '#10B981' : undefined;
  return (
    <View style={styles.statBox}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="label" style={color ? { color, fontWeight: '800' } : { fontWeight: '800' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(128,128,128,0.06)',
    gap: 2,
  },
  empty: {
    lineHeight: 18,
  },
});
