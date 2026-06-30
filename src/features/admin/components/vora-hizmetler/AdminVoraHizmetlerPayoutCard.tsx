import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminRideStatusBadge } from '@/features/admin/components/rides/AdminRideStatusBadge';
import { AdminHeyetChip } from '@/features/heyet/components/AdminHeyetChip';
import {
  formatHizmetCents,
  type AdminVoraPayoutRow,
} from '@/features/vora-hizmetler/services/payoutData';
import { serviceRequestDetailPath } from '@/features/vora-hizmetler/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  row: AdminVoraPayoutRow;
  payoutRef: string;
  onPayoutRefChange: (value: string) => void;
  onMarkPaid: () => void;
  onRefund?: () => void;
  actionLoading?: boolean;
};

function payoutDaysRemaining(payoutDueAt: string | null): number | null {
  if (!payoutDueAt) return null;
  return Math.ceil((new Date(payoutDueAt).getTime() - Date.now()) / 86_400_000);
}

function MoneyRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.moneyRow}>
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text variant="caption" style={{ fontWeight: '700', color: accent ?? colors.text }}>
        {value}
      </Text>
    </View>
  );
}

export function AdminVoraHizmetlerPayoutCard({
  row,
  payoutRef,
  onPayoutRefChange,
  onMarkPaid,
  onRefund,
  actionLoading = false,
}: Props) {
  const { colors } = useTheme();
  const paid = !!row.payoutCompletedAt;
  const disputed = !!row.disputeOpenedAt;
  const daysLeft = payoutDaysRemaining(row.payoutDueAt);
  const overdue = !paid && daysLeft != null && daysLeft < 0;

  const statusLabel = paid
    ? 'Yatırıldı'
    : disputed
      ? 'İtirazlı'
      : overdue
        ? 'Gecikmiş'
        : daysLeft === 0
          ? 'Bugün'
          : daysLeft != null
            ? `${daysLeft} gün`
            : 'Bekliyor';

  const statusTone = paid
    ? 'success'
    : disputed
      ? 'danger'
      : overdue
        ? 'danger'
        : daysLeft != null && daysLeft <= 2
          ? 'warning'
          : 'primary';

  const canMarkPaid = !paid && !!row.payoutDueAt && !disputed;
  const canRefund = !paid && disputed && onRefund;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={2}>
            {row.requestTitle}
          </Text>
          <Text secondary variant="caption">
            {row.providerName} · usta transferi
          </Text>
        </View>
        <AdminRideStatusBadge label={statusLabel} tone={statusTone} />
      </View>

      <View style={[styles.moneyBlock, { borderColor: colors.border }]}>
        <MoneyRow label="Usta net" value={formatHizmetCents(row.providerNetCents)} accent={colors.success} />
        <MoneyRow
          label="Vade"
          value={row.payoutDueAt ? new Date(row.payoutDueAt).toLocaleDateString('tr-TR') : '—'}
        />
        <MoneyRow label="Durum" value={row.status} />
      </View>

      {disputed ? (
        <Text variant="caption" style={{ color: colors.warning }}>
          Açık itiraz — ödeme bekletiliyor. Heyet açıp iade işlemini tamamlayın.
        </Text>
      ) : null}

      {canMarkPaid ? (
        <Input
          label="Transfer referansı"
          value={payoutRef}
          onChangeText={onPayoutRefChange}
          placeholder="Banka dekont / EFT referansı"
        />
      ) : null}

      <View style={styles.actions}>
        {canMarkPaid ? (
          <AdminActionChip
            label="Ödeme yapıldı"
            icon="wallet-outline"
            tone="success"
            compact
            onPress={onMarkPaid}
            loading={actionLoading}
          />
        ) : null}
        {canRefund ? (
          <AdminActionChip
            label="Stripe iade"
            icon="return-down-back-outline"
            tone="danger"
            compact
            onPress={onRefund}
            loading={actionLoading}
          />
        ) : null}
        {disputed ? (
          <AdminHeyetChip
            subjectType="vora_service_request"
            subjectId={row.requestId}
            partyALabel="Müşteri"
            partyBLabel={row.providerName}
          />
        ) : null}
        <AdminActionChip
          label="İş detayı"
          icon="open-outline"
          tone="default"
          compact
          onPress={() => router.push(serviceRequestDetailPath(row.requestId) as never)}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  moneyBlock: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
  },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
