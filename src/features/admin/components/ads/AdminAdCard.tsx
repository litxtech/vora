import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AD_STATUS_LABELS, adTypeMeta, formatAdDate, formatBudget } from '@/features/ads/constants';
import type { AdType } from '@/features/ads/types';
import type { BusinessAdRow } from '@/features/admin/services/adsManagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminAdCardProps = {
  ad: BusinessAdRow;
  onReview: () => void;
  onQuickApprove?: () => void;
  onQuickReject?: () => void;
  showQuickActions?: boolean;
  actionLoading?: boolean;
};

export function AdminAdCard({
  ad,
  onReview,
  onQuickApprove,
  onQuickReject,
  showQuickActions = false,
  actionLoading = false,
}: AdminAdCardProps) {
  const { colors } = useTheme();
  const meta = adTypeMeta(ad.ad_type as AdType);
  const isWallet = ad.billing_mode === 'wallet_cpc' || ad.budget_cents > 0;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        {ad.image_url ? (
          <Image source={{ uri: ad.image_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={2}>
            {ad.title}
          </Text>
          <Text secondary variant="caption" numberOfLines={2}>
            {ad.description}
          </Text>
          <Text secondary variant="caption">
            @{ad.owner_username} · {meta.label} · {formatAdDate(ad.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Text variant="caption" style={{ color: meta.color, fontWeight: '700', fontSize: 11 }}>
            {AD_STATUS_LABELS[ad.status] ?? ad.status}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surfaceElevated }]}>
          <Text variant="caption" style={{ fontWeight: '600', fontSize: 11 }}>
            {formatBudget(ad.budget_cents)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <AdminActionChip label="İncele" icon="eye-outline" tone="default" onPress={onReview} compact />
        {showQuickActions && onQuickApprove && onQuickReject ? (
          <>
            <AdminActionChip
              label="Onayla"
              icon="checkmark"
              tone="success"
              onPress={onQuickApprove}
              loading={actionLoading}
              compact
            />
            <AdminActionChip
              label="Reddet"
              icon="close"
              tone="danger"
              onPress={onQuickReject}
              loading={actionLoading}
              compact
            />
          </>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 4 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
