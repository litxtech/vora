import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatCount } from '@/features/profile/constants';
import { INSIGHTS_ACCENT, INSIGHTS_PREMIUM_GOLD } from '@/features/insights/constants';
import { showPremiumBadge } from '@/features/profile/services/premiumAccess';
import type { ProfileStats } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type InsightsHubLinkCardProps = {
  stats: ProfileStats;
  trustScore: number;
  isPremium: boolean;
};

export function InsightsHubLinkCard({ stats, trustScore, isPremium }: InsightsHubLinkCardProps) {
  const { colors } = useTheme();
  const premiumBadge = showPremiumBadge(isPremium);

  const openHub = () => router.push('/settings/insights' as Href);

  return (
    <Pressable onPress={openHub}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${INSIGHTS_ACCENT}22` }]}>
            <Ionicons name="analytics" size={20} color={INSIGHTS_ACCENT} />
          </View>
          <View style={styles.headerCopy}>
            <Text variant="label">İçgörüler & Güven</Text>
            <Text secondary variant="caption">
              İstatistikler, demografi ve güven puanınızı yönetin
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <View style={styles.metrics}>
          <MetricPill label="Güven" value={String(trustScore)} accent={colors.primary} />
          <MetricPill label="Görüntülenme" value={formatCount(stats.totalViews)} accent={INSIGHTS_ACCENT} />
          <MetricPill label="Ziyaret" value={formatCount(stats.profileViewCount)} accent={colors.accent} />
          {premiumBadge ? (
            <View style={[styles.premiumPill, { borderColor: `${INSIGHTS_PREMIUM_GOLD}55` }]}>
              <Ionicons name="diamond" size={10} color={INSIGHTS_PREMIUM_GOLD} />
              <Text variant="caption" style={{ color: INSIGHTS_PREMIUM_GOLD, fontSize: 10, fontWeight: '700' }}>
                Premium
              </Text>
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.metricPill, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}>
      <Text variant="caption" style={{ color: accent, fontWeight: '800' }}>
        {value}
      </Text>
      <Text secondary variant="caption" style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  metricPill: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 72,
  },
  metricLabel: { fontSize: 10 },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    marginLeft: 'auto',
  },
});
