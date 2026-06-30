import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminPremiumStatusBadge } from '@/features/admin/components/premium/AdminPremiumStatusBadge';
import {
  PREMIUM_PAYMENT_PROVIDER_LABELS,
  STRIPE_PLAN_LABELS,
  STRIPE_SUBSCRIPTION_STATUS_LABELS,
} from '@/features/admin/constants';
import type { PremiumSubscriptionRow } from '@/features/admin/services/premiumManagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const PREMIUM_GOLD = '#FFB300';

type AdminPremiumSubscriptionCardProps = {
  item: PremiumSubscriptionRow;
  onRevoke: (item: PremiumSubscriptionRow) => void;
  revokeLoading?: boolean;
};

function subscriptionStatusTone(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'active') return 'success';
  if (status === 'past_due') return 'warning';
  if (status === 'expired' || status === 'canceled' || status === 'cancelled') return 'danger';
  return 'default';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function getRemainingDays(expiresAt: string): number {
  const end = new Date(expiresAt).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

function getSubscriptionProgress(startsAt: string, expiresAt: string): number {
  const start = new Date(startsAt).getTime();
  const end = new Date(expiresAt).getTime();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

export function AdminPremiumSubscriptionCard({
  item,
  onRevoke,
  revokeLoading = false,
}: AdminPremiumSubscriptionCardProps) {
  const { colors } = useTheme();
  const statusLabel = STRIPE_SUBSCRIPTION_STATUS_LABELS[item.status] ?? item.status;
  const planLabel = STRIPE_PLAN_LABELS[item.plan] ?? item.plan;
  const providerLabel = PREMIUM_PAYMENT_PROVIDER_LABELS[item.payment_provider] ?? item.payment_provider;
  const isActive = item.status === 'active';
  const remainingDays = getRemainingDays(item.expires_at);
  const progress = getSubscriptionProgress(item.starts_at, item.expires_at);

  return (
    <GlassCard style={[styles.card, isActive && { borderColor: `${PREMIUM_GOLD}33` }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${PREMIUM_GOLD}22` }]}>
          <Ionicons name="diamond" size={18} color={PREMIUM_GOLD} />
        </View>
        <View style={styles.headerText}>
          <Text variant="label">@{item.username}</Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {item.full_name ?? 'İsim yok'}
          </Text>
        </View>
        <AdminPremiumStatusBadge
          label={statusLabel}
          tone={subscriptionStatusTone(item.status)}
          dot
        />
      </View>

      <View style={styles.badges}>
        <AdminPremiumStatusBadge label={planLabel} tone="gold" />
        <AdminPremiumStatusBadge
          label={providerLabel}
          tone={item.payment_provider === 'apple' ? 'primary' : 'default'}
        />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Text secondary variant="caption">
            Başlangıç
          </Text>
          <Text variant="caption">{formatDate(item.starts_at)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text secondary variant="caption">
            Bitiş
          </Text>
          <Text variant="caption">{formatDate(item.expires_at)}</Text>
        </View>
        {isActive ? (
          <View style={styles.metaItem}>
            <Text secondary variant="caption">
              Kalan
            </Text>
            <Text variant="caption" style={{ color: PREMIUM_GOLD, fontWeight: '700' }}>
              {remainingDays} gün
            </Text>
          </View>
        ) : null}
      </View>

      {isActive ? (
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: `${colors.border}88` }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: PREMIUM_GOLD },
              ]}
            />
          </View>
        </View>
      ) : null}

      {item.payment_provider === 'apple' && item.apple_original_transaction_id ? (
        <View style={[styles.txRow, { backgroundColor: `${colors.surface}88` }]}>
          <Ionicons name="logo-apple" size={14} color={colors.textMuted} />
          <Text secondary variant="caption" numberOfLines={1} style={styles.txText}>
            {item.apple_original_transaction_id}
            {item.apple_product_id ? ` · ${item.apple_product_id}` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AdminActionChip
          label="Profil"
          icon="person-outline"
          tone="default"
          compact
          onPress={() => router.push(`/admin/users/${item.user_id}` as Href)}
        />
        {isActive ? (
          <AdminActionChip
            label="Premium iptal"
            icon="close-circle"
            tone="danger"
            compact
            loading={revokeLoading}
            onPress={() => onRevoke(item)}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: { gap: 2, minWidth: 88 },
  progressWrap: { marginTop: 2 },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  txText: { flex: 1 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
