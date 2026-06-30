import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { WalletActivityFeed } from '@/features/wallet/components/WalletActivityFeed';
import { WalletEarningsPanel } from '@/features/wallet/components/WalletEarningsPanel';
import { WalletHeroCard } from '@/features/wallet/components/WalletHeroCard';
import { WalletQuickActions } from '@/features/wallet/components/WalletQuickActions';
import { WalletTabBar } from '@/features/wallet/components/WalletTabBar';
import { ReferralWalletPanel } from '@/features/referral-earnings/components/ReferralWalletPanel';
import { TrustVacationPromoSlot } from '@/features/trust-promo';
import { PUAN_LABEL } from '@/features/wallet/constants';
import { cacheWalletActivities } from '@/features/wallet/services/activityCache';
import { fetchTrustScoreSummary } from '@/features/wallet/services/trustScoreData';
import { fetchWalletActivity } from '@/features/wallet/services/walletActivity';
import { fetchWalletEarningsSummary } from '@/features/wallet/services/walletSummary';
import type { TrustScoreSummary, WalletActivityItem, WalletEarningsSummary, WalletTab } from '@/features/wallet/types';
import { spacing } from '@/constants/theme';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { WALLET_FEATURE } from '@/features/wallet/featureFlags';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const EMPTY_EARNINGS: WalletEarningsSummary = {
  marketplaceNetCents: 0,
  marketplacePaidCents: 0,
  marketplacePendingCents: 0,
  marketplaceSaleCount: 0,
  ridesNetCents: 0,
  ridesPaidCents: 0,
  ridesPendingCents: 0,
  ridesScheduledCents: 0,
  ridesTripCount: 0,
  hotelNetCents: 0,
  hotelPaidCents: 0,
  hotelScheduledCents: 0,
  hotelEscrowCents: 0,
  hotelReservationCount: 0,
  hasMarketplace: false,
  hasRides: false,
  hasHotel: false,
};

const EMPTY_POINTS: TrustScoreSummary = {
  balance: 50,
  maxScore: 100,
  lifetimeEarned: 0,
  lifetimeLost: 0,
};

export function WalletHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const showPointsTab = useFeatureVisible(WALLET_FEATURE.tab.points);
  const showEarningsTab = useFeatureVisible(WALLET_FEATURE.tab.earnings);
  const showReferralPanel = useFeatureVisible(WALLET_FEATURE.referralPanel);
  const [tab, setTab] = useState<WalletTab>('points');
  const [summary, setSummary] = useState<TrustScoreSummary>(EMPTY_POINTS);
  const [earnings, setEarnings] = useState<WalletEarningsSummary>(EMPTY_EARNINGS);
  const [activities, setActivities] = useState<WalletActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (tab === 'points' && !showPointsTab && showEarningsTab) {
      setTab('earnings');
      return;
    }
    if (tab === 'earnings' && !showEarningsTab && showPointsTab) {
      setTab('points');
    }
  }, [tab, showPointsTab, showEarningsTab]);

  const load = useCallback(async () => {
    if (!user) return;
    const [nextSummary, nextActivity, nextEarnings] = await Promise.all([
      fetchTrustScoreSummary(user.id),
      fetchWalletActivity(user.id),
      fetchWalletEarningsSummary(user.id),
    ]);
    setSummary(nextSummary);
    setActivities(nextActivity);
    cacheWalletActivities(nextActivity);
    setEarnings(nextEarnings);
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
          <AuthHeader title="Cüzdan" subtitle="Güven puanı ve TRY kazançlarınız tek yerde" />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text variant="caption" secondary>
                Bakiyeniz yükleniyor…
              </Text>
            </View>
          ) : (
            <>
              {tab === 'points' && showPointsTab ? (
                <>
                  <WalletHeroCard points={summary} earnings={earnings} />
                  <TrustVacationPromoSlot
                    placement="wallet"
                    currentScore={summary.balance}
                    maxScore={summary.maxScore}
                  />
                </>
              ) : null}
              {(showPointsTab || showEarningsTab) ? <WalletTabBar value={tab} onChange={setTab} /> : null}

              {tab === 'points' && showPointsTab ? (
                <>
                  <WalletQuickActions />

                  <WalletActivityFeed
                    items={activities}
                    showFilters
                    emptyHint={`${PUAN_LABEL} hareketleri, TRY kazançları ve reklam ödemeleri burada listelenir.`}
                  />
                </>
              ) : null}
              {tab === 'earnings' && showEarningsTab ? (
                <>
                  <WalletEarningsPanel summary={earnings} activities={activities} />
                  {showReferralPanel ? <ReferralWalletPanel /> : null}
                </>
              ) : null}
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
  },
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
