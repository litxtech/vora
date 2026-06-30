import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { WalletActivityFeed } from '@/features/wallet/components/WalletActivityFeed';
import {
  POINTS_GRADIENT,
  PUAN_LABEL,
  WALLET_ROUTE,
} from '@/features/wallet/constants';
import { cacheWalletActivities } from '@/features/wallet/services/activityCache';
import { fetchTrustScoreSummary } from '@/features/wallet/services/trustScoreData';
import { fetchWalletActivity } from '@/features/wallet/services/walletActivity';
import type { TrustScoreSummary, WalletActivityItem } from '@/features/wallet/types';
import { formatPointsAmountParts } from '@/features/wallet/utils';
import { radius, spacing } from '@/constants/theme';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const EMPTY_POINTS: TrustScoreSummary = {
  balance: 50,
  maxScore: 100,
  lifetimeEarned: 0,
  lifetimeLost: 0,
};

function PointsSummaryCard({ summary }: { summary: TrustScoreSummary }) {
  const parts = formatPointsAmountParts(summary.balance, summary.maxScore);

  return (
    <LinearGradient
      colors={[`${POINTS_GRADIENT[0]}F0`, `${POINTS_GRADIENT[1]}E8`, `${POINTS_GRADIENT[2]}D8`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View style={[styles.orb, styles.orbA]} />
      <View style={[styles.orb, styles.orbB]} />

      <View style={styles.summaryTop}>
        <View style={styles.summaryBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#fff" />
          <Text variant="caption" style={styles.summaryBadgeText}>
            {PUAN_LABEL}
          </Text>
        </View>
        <Text variant="caption" style={styles.summaryHint}>
          Güncel bakiye
        </Text>
      </View>

      <View style={styles.summaryAmountRow}>
        <Text style={styles.summaryAmount}>{parts.value}</Text>
        <Text style={styles.summarySuffix}>{parts.suffix}</Text>
      </View>

      <View style={styles.summaryFooter}>
        <SummaryChip icon="trending-up" label="Kazanım" value={`+${summary.lifetimeEarned.toLocaleString('tr-TR')}`} />
        <SummaryChip icon="trending-down" label="Düşüş" value={`-${summary.lifetimeLost.toLocaleString('tr-TR')}`} />
      </View>
    </LinearGradient>
  );
}

function SummaryChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryChip}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.9)" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" style={styles.chipLabel}>
          {label}
        </Text>
        <Text variant="caption" style={styles.chipValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function WalletPointsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [summary, setSummary] = useState<TrustScoreSummary>(EMPTY_POINTS);
  const [activities, setActivities] = useState<WalletActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [nextSummary, nextActivity] = await Promise.all([
      fetchTrustScoreSummary(user.id),
      fetchWalletActivity(user.id),
    ]);
    setSummary(nextSummary);
    setActivities(nextActivity);
    cacheWalletActivities(nextActivity);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void load().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <FeatureGate featureId="wallet">
      <GradientBackground>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <AuthHeader
            title="Puan geçmişi"
            subtitle="Kazanım ve düşüş hareketleriniz"
            showBack
          />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text variant="caption" secondary>
                Puan hareketleri yükleniyor…
              </Text>
            </View>
          ) : (
            <>
              <PointsSummaryCard summary={summary} />

              <WalletActivityFeed
                items={activities}
                mode="points"
                title="Puan hareketleri"
                emptyTitle="Henüz puan hareketi yok"
                emptyHint="Doğrulanmış içerik, etkinlik ve diğer katkılarınız burada listelenir."
              />

              <Pressable
                onPress={() => router.push(WALLET_ROUTE as Href)}
                style={({ pressed }) => [
                  styles.walletLink,
                  {
                    borderColor: colors.border,
                    backgroundColor: `${colors.primary}08`,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                <Text variant="body" style={{ flex: 1, fontWeight: '600' }}>
                  Tüm cüzdanı aç
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </GradientBackground>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  summaryCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    minHeight: 148,
    gap: spacing.sm,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  orbA: {
    width: 120,
    height: 120,
    top: -36,
    right: -24,
  },
  orbB: {
    width: 72,
    height: 72,
    bottom: -20,
    left: -12,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  summaryBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  summaryHint: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
    fontSize: 11,
  },
  summaryAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1,
  },
  summarySuffix: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 0,
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
  },
  chipValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  walletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
});
