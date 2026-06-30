import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { AdminVoraHizmetlerPayoutCard } from '@/features/admin/components/vora-hizmetler/AdminVoraHizmetlerPayoutCard';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import {
  adminListVoraPayouts,
  adminMarkVoraPayout,
  adminRefundVoraServicePayment,
  formatHizmetCents,
  type AdminVoraPayoutRow,
} from '@/features/vora-hizmetler/services/payoutData';
import { radius, spacing } from '@/constants/theme';

type PayoutFilter = 'all' | 'payout_due' | 'overdue' | 'disputed' | 'paid';

const PAYOUT_FILTERS: { id: PayoutFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'payout_due', label: 'Ödeme bekleyen' },
  { id: 'overdue', label: 'Gecikmiş' },
  { id: 'disputed', label: 'İtirazlı' },
  { id: 'paid', label: 'Yatırılan' },
];

function filterRows(rows: AdminVoraPayoutRow[], filter: PayoutFilter): AdminVoraPayoutRow[] {
  const now = Date.now();
  return rows.filter((row) => {
    if (filter === 'paid') return !!row.payoutCompletedAt;
    if (filter === 'disputed') return !!row.disputeOpenedAt && !row.payoutCompletedAt;
    if (filter === 'overdue') {
      return (
        !row.payoutCompletedAt &&
        !!row.payoutDueAt &&
        new Date(row.payoutDueAt).getTime() < now
      );
    }
    if (filter === 'payout_due') {
      return !row.payoutCompletedAt && !!row.payoutDueAt && !row.disputeOpenedAt;
    }
    return true;
  });
}

export function AdminVoraHizmetlerScreen() {
  const guard = useAdminGuard();
  const [filter, setFilter] = useState<PayoutFilter>('payout_due');
  const [rows, setRows] = useState<AdminVoraPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  const load = useCallback(
    async (isRefresh = false) => {
      if (guard.status !== 'allowed') return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await adminListVoraPayouts(100);
      if (result.error) Alert.alert('Hata', result.error);
      setRows(result.rows);
      setLoading(false);
      setRefreshing(false);
    },
    [guard.status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => !r.payoutCompletedAt && r.payoutDueAt && !r.disputeOpenedAt);
    const overdue = rows.filter(
      (r) =>
        !r.payoutCompletedAt &&
        r.payoutDueAt &&
        new Date(r.payoutDueAt).getTime() < Date.now(),
    );
    const disputed = rows.filter((r) => r.disputeOpenedAt && !r.payoutCompletedAt);
    const pendingCents = pending.reduce((sum, r) => sum + r.providerNetCents, 0);
    return {
      pendingCount: pending.length,
      overdueCount: overdue.length,
      disputedCount: disputed.length,
      pendingCents,
    };
  }, [rows]);

  const runMarkPaid = async (paymentId: string) => {
    const reference = payoutRefs[paymentId]?.trim();
    if (!reference) {
      Alert.alert('Referans gerekli', 'Banka transfer referansını girin.');
      return;
    }
    setActionId(paymentId);
    const result = await adminMarkVoraPayout(paymentId, reference);
    setActionId(null);
    if (result.error) Alert.alert('Hata', result.error);
    else Alert.alert('Tamam', 'Usta ödemesi yatırıldı olarak işaretlendi.');
    await load(true);
  };

  const runRefund = (paymentId: string) => {
    Alert.alert(
      'Stripe iade',
      'Müşteriye tam iade başlatılacak ve kayıt güncellenecek. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İade et',
          style: 'destructive',
          onPress: async () => {
            setActionId(paymentId);
            const result = await adminRefundVoraServicePayment(paymentId);
            setActionId(null);
            if (result.error) Alert.alert('Hata', result.error);
            else Alert.alert('Tamam', result.message ?? 'İade işlemi tamamlandı.');
            await load(true);
          },
        },
      ],
    );
  };

  if (guard.status !== 'allowed') {
    return (
      <AdminShell title="Vora Hizmetler" subtitle="Yetki gerekli" requireAdmin>
        <Text secondary>Admin yetkisi gerekli.</Text>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Vora Hizmetler"
      subtitle="Usta ödemeleri · escrow · itiraz"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <LinearGradient
        colors={[`${VORA_HIZMETLER_ACCENT}22`, 'transparent']}
        style={styles.hero}
      >
        <Text variant="label">Bekleyen usta ödemeleri</Text>
        <Text variant="h2" style={{ color: VORA_HIZMETLER_ACCENT }}>
          {formatHizmetCents(stats.pendingCents)}
        </Text>
        <View style={styles.statRow}>
          <StatPill label="Bekleyen" value={String(stats.pendingCount)} />
          <StatPill label="Gecikmiş" value={String(stats.overdueCount)} accent="#EF4444" />
          <StatPill label="İtiraz" value={String(stats.disputedCount)} accent="#F59E0B" />
        </View>
      </LinearGradient>

      <AdminFilterChip options={PAYOUT_FILTERS} value={filter} onChange={setFilter} />

      <AdminSectionHeader
        title="Ödeme kuyruğu"
        hint="IBAN transferi sonrası referans ile «Ödeme yapıldı» işaretleyin"
      />

      {loading && !refreshing ? (
        <AdminEmptyState loading />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title="Kayıt yok"
          message="Seçili filtrede işlem bulunamadı."
          icon="construct-outline"
        />
      ) : (
        filtered.map((row) => (
          <AdminVoraHizmetlerPayoutCard
            key={row.paymentId}
            row={row}
            payoutRef={payoutRefs[row.paymentId] ?? ''}
            onPayoutRefChange={(value) =>
              setPayoutRefs((prev) => ({ ...prev, [row.paymentId]: value }))
            }
            onMarkPaid={() => void runMarkPaid(row.paymentId)}
            onRefund={row.disputeOpenedAt ? () => runRefund(row.paymentId) : undefined}
            actionLoading={actionId === row.paymentId}
          />
        ))
      )}
    </AdminShell>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.statPill, accent ? { borderColor: `${accent}40` } : null]}>
      <Text variant="caption" style={{ fontWeight: '800', color: accent }}>
        {value}
      </Text>
      <Text secondary variant="caption">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.25)',
    minWidth: 72,
  },
});
