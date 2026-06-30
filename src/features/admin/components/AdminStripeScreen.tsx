import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import {
  CONTRIBUTION_STATUS_LABELS,
  EVENT_TICKET_STATUS_LABELS,
  STRIPE_PAYMENT_STATUS_LABELS,
  STRIPE_PAYMENT_TYPE_LABELS,
  STRIPE_PLAN_LABELS,
  STRIPE_SUBSCRIPTION_STATUS_LABELS,
} from '@/features/admin/constants';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { useAdminStripePoll } from '@/features/admin/hooks/useAdminStripePoll';
import {
  cancelStripeSubscription,
  refundStripePayment,
  type StripePaymentRow,
  type StripeSubscriptionRow,
} from '@/features/admin/services/stripeAdmin';
import { contributionTierLabel } from '@/features/platform-support/services/adminContributions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'overview' | 'subscriptions' | 'payments';
type PaymentFilter = 'all' | 'completed' | 'refunded' | 'pending';

const TABS = [
  { id: 'overview' as const, label: 'Canlı özet' },
  { id: 'subscriptions' as const, label: 'Abonelikler' },
  { id: 'payments' as const, label: 'Ödemeler & İade' },
];

const PAYMENT_FILTERS: { id: PaymentFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'completed', label: 'Ödenenler' },
  { id: 'refunded', label: 'İade edilenler' },
  { id: 'pending', label: 'Bekleyenler' },
];

function formatMoney(amount: number): string {
  return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR');
}

function paymentStatusLabel(row: StripePaymentRow): string {
  if (row.payment_type === 'contribution') {
    return CONTRIBUTION_STATUS_LABELS[row.status] ?? STRIPE_PAYMENT_STATUS_LABELS[row.status] ?? row.status;
  }
  return EVENT_TICKET_STATUS_LABELS[row.status] ?? STRIPE_PAYMENT_STATUS_LABELS[row.status] ?? row.status;
}

function paymentStatusTone(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'completed' || status === 'paid') return 'success';
  if (status === 'refunded') return 'warning';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'default';
}

function subscriptionStatusTone(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'active') return 'success';
  if (status === 'past_due') return 'warning';
  if (status === 'expired' || status === 'canceled' || status === 'cancelled') return 'danger';
  return 'default';
}

function isRefundable(row: StripePaymentRow): boolean {
  return (
    Boolean(row.stripe_payment_intent_id) &&
    ((row.payment_type === 'contribution' && row.status === 'completed') ||
      (row.payment_type === 'event_ticket' && row.status === 'paid'))
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'default' }) {
  const { colors } = useTheme();
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : colors.textSecondary;

  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text variant="caption" style={{ color, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function LiveBadge({ lastUpdatedAt }: { lastUpdatedAt: Date | null }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.liveBadge, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}>
      <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
      <Text variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
        Canlı · {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('tr-TR') : 'yükleniyor'}
      </Text>
    </View>
  );
}

function InfoBanner() {
  const { colors } = useTheme();
  return (
    <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}33` }]}>
      <View style={styles.infoRow}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <View style={styles.infoText}>
          <Text variant="label">Stripe yönetim paneli</Text>
          <Text secondary variant="caption">
            Abonelikler dönem sonunda iptal edilir. Tek seferlik ödemeler (destek katkısı, etkinlik bileti) buradan
            iade edilebilir. İade Stripe üzerinden başlatılır ve birkaç gün içinde kullanıcıya yansır.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function AdminStripeScreen() {
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const enabled = guard.status === 'allowed';
  const { snapshot, loading, refreshing, error, lastUpdatedAt, refresh } = useAdminStripePoll(enabled);

  const [tab, setTab] = useState<Tab>('overview');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const summary = snapshot?.summary ?? null;
  const subscriptions = snapshot?.subscriptions ?? [];
  const payments = snapshot?.payments ?? [];

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return payments;
    if (paymentFilter === 'completed') {
      return payments.filter((row) => row.status === 'completed' || row.status === 'paid');
    }
    if (paymentFilter === 'refunded') return payments.filter((row) => row.status === 'refunded');
    return payments.filter((row) => row.status === 'pending');
  }, [paymentFilter, payments]);

  const totalStripeVolume = useMemo(() => {
    if (!summary) return 0;
    return (summary.contribution_total ?? 0) + (summary.event_ticket_total ?? 0);
  }, [summary]);

  const handleCancel = (item: StripeSubscriptionRow) => {
    Alert.alert(
      'Aboneliği iptal et',
      `@${item.username} kullanıcısının Premium aboneliği sonlandırılsın mı?\n\nKullanıcı mevcut dönem sonuna kadar erişimini sürdürür; kısmi iade yapılmaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: async () => {
            setCancelingId(item.id);
            const { error: cancelError } = await cancelStripeSubscription(item.id);
            setCancelingId(null);
            if (cancelError) Alert.alert('Hata', cancelError);
            else refresh();
          },
        },
      ],
    );
  };

  const handleRefund = (row: StripePaymentRow) => {
    const typeLabel = STRIPE_PAYMENT_TYPE_LABELS[row.payment_type] ?? row.payment_type;
    const amount = formatMoney(row.amount_cents / 100);

    Alert.alert(
      'Stripe iadesi başlat',
      `@${row.username} · ${typeLabel}\n${amount}\n\nİade Stripe üzerinden gerçekleştirilir. Onaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İade et',
          style: 'destructive',
          onPress: async () => {
            setRefundingId(row.id);
            const result = await refundStripePayment(row.payment_type, row.id);
            setRefundingId(null);
            if (result.error) Alert.alert('İade başarısız', result.error);
            else {
              Alert.alert('İade başlatıldı', result.message ?? 'Ödeme iade edildi.');
              refresh();
            }
          },
        },
      ],
    );
  };

  const renderOverview = () => {
    if (!summary) {
      return <AdminEmptyState title="Özet yok" message="Stripe özeti alınamadı." icon="card-outline" />;
    }

    return (
      <>
        <AdminSectionHeader title="Canlı durum" hint="30 saniyede bir otomatik yenilenir" />
        <View style={styles.statsGrid}>
          <AdminStatCard label="Aktif abonelik" value={summary.active_subscriptions} icon="star" accent={colors.success} />
          <AdminStatCard
            label="Stripe bağlı abonelik"
            value={summary.stripe_linked_subscriptions}
            icon="link"
            accent={colors.primary}
          />
          <AdminStatCard
            label="Toplam Stripe hacmi"
            value={formatMoney(totalStripeVolume)}
            icon="cash"
            accent={colors.accent}
          />
          <AdminStatCard
            label="Destek katkıları"
            value={`${summary.contribution_payments} · ${formatMoney(summary.contribution_total)}`}
            icon="heart"
            accent={colors.accent}
          />
          <AdminStatCard
            label="Etkinlik biletleri"
            value={`${summary.event_ticket_payments ?? 0} · ${formatMoney(summary.event_ticket_total ?? 0)}`}
            icon="ticket-outline"
            accent={colors.primary}
          />
          <AdminStatCard
            label="İade edilen"
            value={`${summary.refunded_payments ?? 0} · ${formatMoney(summary.refunded_total ?? 0)}`}
            icon="return-down-back"
            accent={colors.warning}
          />
          <AdminStatCard
            label="Bekleyen ödeme"
            value={summary.pending_payments ?? 0}
            icon="time"
            accent={colors.warning}
          />
          <AdminStatCard
            label="İptal / süresi dolmuş"
            value={summary.canceled_subscriptions + summary.expired_subscriptions}
            icon="close-circle"
            accent={colors.danger}
          />
        </View>

        <GlassCard style={styles.timelineCard}>
          <View style={styles.timelineRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text secondary variant="caption">
              Son abonelik: {formatDateTime(summary.last_subscription_at)}
            </Text>
          </View>
          <View style={styles.timelineRow}>
            <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
            <Text secondary variant="caption">
              Son ödeme: {formatDateTime(summary.last_payment_at)}
            </Text>
          </View>
        </GlassCard>
      </>
    );
  };

  const renderSubscriptions = () => {
    if (subscriptions.length === 0) {
      return (
        <AdminEmptyState
          title="Abonelik yok"
          message="Kayıtlı Stripe aboneliği bulunamadı."
          icon="card-outline"
        />
      );
    }

    return subscriptions.map((item) => {
      const statusLabel = STRIPE_SUBSCRIPTION_STATUS_LABELS[item.status] ?? item.status;
      const planLabel = STRIPE_PLAN_LABELS[item.plan] ?? item.plan;

      return (
        <GlassCard key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text variant="label">@{item.username}</Text>
              <Text secondary variant="caption">
                {planLabel}
              </Text>
            </View>
            <StatusPill label={statusLabel} tone={subscriptionStatusTone(item.status)} />
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text secondary variant="caption">
                Başlangıç
              </Text>
              <Text variant="caption">{new Date(item.starts_at).toLocaleDateString('tr-TR')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text secondary variant="caption">
                Bitiş
              </Text>
              <Text variant="caption">{new Date(item.expires_at).toLocaleDateString('tr-TR')}</Text>
            </View>
          </View>

          {item.stripe_subscription_id ? (
            <Text secondary variant="caption" numberOfLines={1}>
              Stripe: {item.stripe_subscription_id}
            </Text>
          ) : (
            <Text secondary variant="caption">
              Stripe bağlantısı yok
            </Text>
          )}

          {item.cancel_at_period_end ? (
            <Text variant="caption" style={{ color: colors.warning }}>
              Dönem sonunda iptal edilecek
            </Text>
          ) : null}

          {item.status === 'active' ? (
            <AdminActionChip
              label="Aboneliği iptal et"
              icon="close-circle"
              tone="danger"
              loading={cancelingId === item.id}
              onPress={() => handleCancel(item)}
            />
          ) : null}
        </GlassCard>
      );
    });
  };

  const renderPayments = () => (
    <>
      <AdminFilterChip options={PAYMENT_FILTERS} value={paymentFilter} onChange={setPaymentFilter} />

      {filteredPayments.length === 0 ? (
        <AdminEmptyState
          title="Ödeme yok"
          message="Bu filtreye uygun Stripe ödemesi bulunamadı."
          icon="receipt-outline"
        />
      ) : (
        filteredPayments.map((row) => {
          const typeLabel = STRIPE_PAYMENT_TYPE_LABELS[row.payment_type] ?? row.payment_type;
          const detailLabel =
            row.payment_type === 'contribution' ? contributionTierLabel(row.label) : row.label;
          const statusLabel = paymentStatusLabel(row);

          return (
            <GlassCard key={`${row.payment_type}-${row.id}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text variant="label">@{row.username}</Text>
                  <Text secondary variant="caption">
                    {typeLabel} · {detailLabel}
                  </Text>
                </View>
                <Text variant="label" style={{ color: colors.accent }}>
                  {formatMoney(row.amount_cents / 100)}
                </Text>
              </View>

              <View style={styles.cardHeader}>
                <StatusPill label={statusLabel} tone={paymentStatusTone(row.status)} />
                <Text secondary variant="caption">
                  {formatDateTime(row.paid_at ?? row.created_at)}
                </Text>
              </View>

              {row.stripe_payment_intent_id ? (
                <Text secondary variant="caption" numberOfLines={1}>
                  PI: {row.stripe_payment_intent_id}
                </Text>
              ) : null}

              {isRefundable(row) ? (
                <AdminActionChip
                  label="Stripe iadesi başlat"
                  icon="return-down-back"
                  tone="warning"
                  loading={refundingId === row.id}
                  onPress={() => handleRefund(row)}
                />
              ) : row.status === 'refunded' ? (
                <View style={[styles.refundedNote, { backgroundColor: `${colors.warning}12` }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.warning} />
                  <Text variant="caption" style={{ color: colors.warning }}>
                    Bu ödeme iade edildi
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          );
        })
      )}
    </>
  );

  return (
    <AdminShell
      title="Ödeme ve İade"
      subtitle="Stripe abonelik, ödeme ve iade yönetimi"
      requireAdmin
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <LiveBadge lastUpdatedAt={lastUpdatedAt} />
      <InfoBanner />
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

      {error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : loading ? (
        <AdminEmptyState loading />
      ) : tab === 'overview' ? (
        renderOverview()
      ) : tab === 'subscriptions' ? (
        <>
          <AdminSectionHeader title="Abonelik listesi" hint={`${subscriptions.length} kayıt`} />
          {renderSubscriptions()}
        </>
      ) : (
        <>
          <AdminSectionHeader title="Ödemeler" hint="İade yalnızca tamamlanmış ödemeler için" />
          {renderPayments()}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: { gap: spacing.xs },
  card: { gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleBlock: { flex: 1, gap: 2 },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: { gap: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoBanner: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, gap: 4 },
  timelineCard: { gap: spacing.xs },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  refundedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
