import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { PREMIUM_GOLD, PREMIUM_GOLD_DARK } from '@/features/profile/constants/premiumUi';
import {
  formatPremiumDate,
  formatPremiumRenewalDate,
  paymentProviderIcon,
  paymentProviderLabel,
  premiumPlanBillingLabel,
  premiumPlanLabel,
  subscriptionPeriodProgress,
  type PremiumSubscription,
} from '@/features/profile/services/premiumService';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SubscriptionStatusHeroProps = {
  subscription: PremiumSubscription | null;
  isPremium: boolean;
};

export function SubscriptionStatusHero({ subscription, isPremium }: SubscriptionStatusHeroProps) {
  const { colors, isDark } = useTheme();

  if (!isPremium && !subscription) return null;

  const planLabel = subscription ? premiumPlanLabel(subscription.plan) : 'Premium';
  const progress = subscription ? subscriptionPeriodProgress(subscription) : 0;
  const providerIcon = subscription ? paymentProviderIcon(subscription.paymentProvider) : 'card-outline';
  const renewLabel = subscription?.cancelAtPeriodEnd ? 'Erişim bitişi' : 'Sonraki yenileme';
  const renewDate = subscription
    ? formatPremiumRenewalDate(subscription.startsAt, subscription.expiresAt, subscription.plan)
    : '—';

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={
          isDark
            ? (['#2A2010', '#1A1508', '#121820'] as const)
            : (['#FFF8E1', '#FFE082', '#FFECB3'] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconRing, { borderColor: `${PREMIUM_GOLD}66` }]}>
            <Ionicons name="diamond" size={28} color={PREMIUM_GOLD} />
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: subscription?.cancelAtPeriodEnd
                  ? `${colors.warning}28`
                  : 'rgba(67, 160, 71, 0.22)',
              },
            ]}
          >
            <Ionicons
              name={subscription?.cancelAtPeriodEnd ? 'time-outline' : 'checkmark-circle'}
              size={13}
              color={subscription?.cancelAtPeriodEnd ? colors.warning : colors.success}
            />
            <Text
              variant="caption"
              style={{
                color: subscription?.cancelAtPeriodEnd ? colors.warning : colors.success,
                fontWeight: '700',
              }}
            >
              {subscription?.cancelAtPeriodEnd ? 'İptal planlandı' : 'Aktif abonelik'}
            </Text>
          </View>
        </View>

        <Text variant="h2" style={[styles.title, { color: isDark ? '#FFF8E1' : '#5D4037' }]}>
          Vora Premium
        </Text>
        <Text variant="body" style={[styles.planName, { color: isDark ? '#E0C080' : '#6D4C41' }]}>
          {planLabel} paket
        </Text>

        {subscription ? (
          <>
            <View style={[styles.progressTrack, { backgroundColor: `${PREMIUM_GOLD}22` }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: PREMIUM_GOLD },
                ]}
              />
            </View>
            <Text variant="caption" style={{ color: isDark ? '#C9A962' : '#8D6E63', textAlign: 'center' }}>
              {renewLabel}: {renewDate}
            </Text>

            <View style={styles.statsGrid}>
              <StatCell
                label="Ücret"
                value={premiumPlanBillingLabel(subscription.plan)}
                isDark={isDark}
              />
              <StatCell
                label="Ödeme"
                value={paymentProviderLabel(subscription.paymentProvider)}
                isDark={isDark}
                icon={providerIcon}
              />
              <StatCell
                label="Başlangıç"
                value={formatPremiumDate(subscription.startsAt)}
                isDark={isDark}
              />
              <StatCell label={renewLabel} value={renewDate} isDark={isDark} />
            </View>
          </>
        ) : (
          <Text variant="caption" style={{ color: isDark ? '#C9A962' : '#8D6E63', textAlign: 'center' }}>
            Premium hesabınız aktif. Abonelik kaydı kısa süre içinde senkronize edilecek.
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

function StatCell({
  label,
  value,
  isDark,
  icon,
}: {
  label: string;
  value: string;
  isDark: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.statCell, { backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.55)' }]}>
      <Text variant="caption" style={{ color: isDark ? '#A89878' : '#8D6E63', fontSize: 10 }}>
        {label}
      </Text>
      <View style={styles.statValueRow}>
        {icon ? <Ionicons name={icon} size={14} color={PREMIUM_GOLD_DARK} /> : null}
        <Text variant="caption" style={{ fontWeight: '700', flex: 1 }} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  title: {
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  planName: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statCell: {
    width: '47%',
    flexGrow: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
