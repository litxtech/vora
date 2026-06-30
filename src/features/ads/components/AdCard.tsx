import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  AD_BILLING_MODE_LABELS,
  AD_STATUS_LABELS,
  adTypeMeta,
  computeCtr,
  ctaLabelText,
  formatAdRegions,
  formatAdRemaining,
  formatBudget,
  isAdExpired,
} from '@/features/ads/constants';
import type { BusinessAd } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdCardProps = {
  ad: BusinessAd;
};

export function AdCard({ ad }: AdCardProps) {
  const { colors } = useTheme();
  const meta = adTypeMeta(ad.adType);
  const statusColor =
    ad.status === 'active' ? colors.success : ad.status === 'pending' ? colors.warning : colors.textMuted;
  const showBudget = ad.billingMode === 'wallet_cpc' || ad.budgetCents > 0;
  const budgetLabel = showBudget
    ? `${formatBudget(ad.spentCents)} / ${formatBudget(ad.budgetCents)}`
    : formatBudget(ad.budgetCents);
  const expired = isAdExpired(ad);
  const remaining = ad.status === 'active' && !expired ? formatAdRemaining(ad.endsAt) : null;

  return (
    <Pressable onPress={() => router.push(`/ads/${ad.id}` as Href)}>
      <GlassCard padded={false} style={styles.card}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: `${meta.color}22` }]}>
              <Ionicons name={meta.icon} size={15} color={meta.color} />
            </View>
            <View style={styles.info}>
              <Text variant="label" numberOfLines={1}>
                {ad.title}
              </Text>
              <Text variant="caption" secondary>
                {meta.label}
              </Text>
            </View>
            <View style={[styles.status, { backgroundColor: `${statusColor}22` }]}>
              <Text variant="caption" style={{ color: statusColor }}>
                {AD_STATUS_LABELS[ad.status] ?? ad.status}
              </Text>
            </View>
          </View>

          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: `${showBudget ? colors.warning : colors.success}18` }]}>
              <Text variant="caption" style={{ fontWeight: '600', fontSize: 11 }}>
                {AD_BILLING_MODE_LABELS[ad.billingMode] ?? ad.billingMode}
              </Text>
            </View>
            {showBudget && ad.cpcCents > 0 ? (
              <View style={[styles.badge, { backgroundColor: `${colors.primary}12` }]}>
                <Text variant="caption" secondary style={{ fontSize: 11 }}>
                  {formatBudget(ad.cpcCents)} / tıklama
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.stats}>
            <Stat
              icon="eye-outline"
              label={`${ad.impressions.toLocaleString('tr-TR')} görüntülenme`}
              colors={colors}
            />
            <Stat
              icon="hand-left-outline"
              label={`${ad.clicks.toLocaleString('tr-TR')} tıklama`}
              colors={colors}
            />
            <Stat
              icon="analytics-outline"
              label={`CTR ${computeCtr(ad.impressions, ad.clicks)}`}
              colors={colors}
            />
          </View>

          <View style={styles.stats}>
            <Stat icon="wallet-outline" label={budgetLabel} colors={colors} />
            <Stat icon="megaphone-outline" label={`İşlem: ${ctaLabelText(ad.ctaLabel)}`} colors={colors} />
          </View>

          <View style={styles.footer}>
            <Text variant="caption" secondary numberOfLines={1} style={styles.footerText}>
              {remaining ?? formatAdRegions(ad.targetRegionIds)}
              {!remaining && ad.targetDistrict ? ` · ${ad.targetDistrict}` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function Stat({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xs,
  },
  inner: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  status: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
  },
});
