import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { InsightsHeroCard } from '@/features/insights/components/InsightsHeroCard';
import { InsightsQuickMetrics } from '@/features/insights/components/InsightsQuickMetrics';
import { InsightsTabBar } from '@/features/insights/components/InsightsTabBar';
import {
  INSIGHTS_ACCENT,
  INSIGHTS_PREMIUM_GOLD,
  type InsightsTab,
} from '@/features/insights/constants';
import { PremiumStatsCard } from '@/features/profile/components/PremiumStatsCard';
import { ProfileCollapsibleSection } from '@/features/profile/components/shared/ProfileCollapsibleSection';
import { ProfileViewersSheet } from '@/features/profile/components/ProfileViewersSheet';
import { TrustStatsCard } from '@/features/profile/components/TrustStatsCard';
import { TrustEarnRulesCard } from '@/features/profile/components/TrustEarnRulesCard';
import { TrustVacationPromoSlot } from '@/features/trust-promo';
import { ViewerDemographicsCard } from '@/features/profile/components/ViewerDemographicsCard';
import { formatCount } from '@/features/profile/constants';
import { fetchProfileById, fetchProfileStatsCore } from '@/features/profile/services/profileData';
import {
  hasPremiumEntitlement,
  subscriptionsCommerceEnabled,
} from '@/features/profile/services/premiumAccess';
import type { ProfileStats, PublicProfile } from '@/features/profile/types';
import { WALLET_POINTS_HISTORY_ROUTE } from '@/features/wallet/constants';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { INSIGHTS_FEATURE } from '@/features/insights/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function SectionIntro({
  icon,
  title,
  subtitle,
  accent,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  accent: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionIntro}>
      <View style={[styles.sectionIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.sectionCopy}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text secondary variant="caption">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

function PremiumBadge() {
  return (
    <View style={[styles.premiumBadge, { borderColor: `${INSIGHTS_PREMIUM_GOLD}55` }]}>
      <Ionicons name="diamond" size={10} color={INSIGHTS_PREMIUM_GOLD} />
      <Text variant="caption" style={{ color: INSIGHTS_PREMIUM_GOLD, fontSize: 10, fontWeight: '700' }}>
        Premium
      </Text>
    </View>
  );
}

function WalletLinkRow() {
  const { colors } = useTheme();
  const showWalletHistory = useFeatureVisible(INSIGHTS_FEATURE.walletHistory);

  if (!showWalletHistory) return null;

  return (
    <Pressable
      onPress={() => router.push(WALLET_POINTS_HISTORY_ROUTE as Href)}
      style={({ pressed }) => [
        styles.linkRow,
        {
          borderColor: colors.border,
          backgroundColor: `${colors.primary}08`,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.linkCopy}>
        <Text variant="body" style={{ fontWeight: '700' }}>
          Puan geçmişi
        </Text>
        <Text secondary variant="caption">
          Kazanım ve düşüş hareketlerinizi görün
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function PremiumInsightsSections({
  stats,
  onOpenViewers,
  showProfileViewers,
  showContentStats,
  showContentDemographics,
}: {
  stats: ProfileStats;
  onOpenViewers: () => void;
  showProfileViewers: boolean;
  showContentStats: boolean;
  showContentDemographics: boolean;
}) {
  const { colors } = useTheme();
  const showBadge = subscriptionsCommerceEnabled();

  return (
    <View style={styles.tabContent}>
      {showContentStats ? (
      <GlassCard style={styles.sectionCard}>
        <SectionIntro
          icon="stats-chart"
          title="İçerik performansı"
          subtitle="Gönderi ve reel etkileşim özeti"
          accent={INSIGHTS_PREMIUM_GOLD}
          trailing={showBadge ? <PremiumBadge /> : undefined}
        />
        <PremiumStatsCard stats={stats} layout="section" />
      </GlassCard>
      ) : null}

      {showContentDemographics ? (
      <GlassCard style={styles.sectionCard}>
        <SectionIntro
          icon="people"
          title="İzleyici demografisi"
          subtitle="Anonim kitle dağılımı"
          accent={INSIGHTS_PREMIUM_GOLD}
          trailing={showBadge ? <PremiumBadge /> : undefined}
        />
        <ViewerDemographicsCard enabled layout="section" autoLoad />
      </GlassCard>
      ) : null}

      {showProfileViewers ? (
      <GlassCard style={styles.sectionCard}>
        <SectionIntro
          icon="eye"
          title="Profil ziyaretçileri"
          subtitle="Profilinize son bakan hesaplar"
          accent={INSIGHTS_PREMIUM_GOLD}
          trailing={showBadge ? <PremiumBadge /> : undefined}
        />
        <Pressable
          onPress={onOpenViewers}
          style={({ pressed }) => [
            styles.linkRow,
            {
              borderColor: colors.border,
              backgroundColor: `${colors.primary}08`,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.linkIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.linkCopy}>
            <Text variant="body" style={{ fontWeight: '700' }}>
              {formatCount(stats.profileViewCount)} görüntülenme
            </Text>
            <Text secondary variant="caption">
              Son ziyaretçileri listele
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </GlassCard>
      ) : null}
    </View>
  );
}

function PremiumInsightsUpsell() {
  const showPremiumUpsell = useFeatureVisible(INSIGHTS_FEATURE.premiumUpsell);

  if (!showPremiumUpsell) return null;

  return (
    <GlassCard style={styles.upsellCard}>
      <View style={[styles.upsellIcon, { backgroundColor: `${INSIGHTS_PREMIUM_GOLD}18` }]}>
        <Ionicons name="diamond" size={24} color={INSIGHTS_PREMIUM_GOLD} />
      </View>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        Premium içgörüler
      </Text>
      <Text secondary variant="caption" style={styles.upsellText}>
        Gelişmiş istatistikler, izleyici demografisi ve profil ziyaretçi listesi Vora Premium ile açılır.
      </Text>
      <Button
        title="Premium'u Keşfet"
        onPress={() => router.push('/settings/premium' as Href)}
        style={{ backgroundColor: INSIGHTS_PREMIUM_GOLD, borderColor: INSIGHTS_PREMIUM_GOLD, alignSelf: 'stretch' }}
      />
    </GlassCard>
  );
}

export function InsightsHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();
  const [tab, setTab] = useState<InsightsTab>('overview');
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const showOverviewTab = useFeatureVisible(INSIGHTS_FEATURE.tab.overview);
  const showTrustTab = useFeatureVisible(INSIGHTS_FEATURE.tab.trust);
  const showContentTab = useFeatureVisible(INSIGHTS_FEATURE.tab.content);
  const showTrustRules = useFeatureVisible(INSIGHTS_FEATURE.trustRules);
  const showProfileViewers = useFeatureVisible(INSIGHTS_FEATURE.profileViewers);
  const showContentStats = useFeatureVisible(INSIGHTS_FEATURE.contentStats);
  const showContentDemographics = useFeatureVisible(INSIGHTS_FEATURE.contentDemographics);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setStats(null);
      setLoading(false);
      return;
    }

    const [fetchedProfile, fetchedStats] = await Promise.all([
      fetchProfileById(user.id),
      fetchProfileStatsCore(user.id),
    ]);
    setProfile(fetchedProfile);
    setStats(fetchedStats);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === 'overview' && !showOverviewTab && showTrustTab) {
      setTab('trust');
      return;
    }
    if (tab === 'overview' && !showOverviewTab && !showTrustTab && showContentTab) {
      setTab('content');
      return;
    }
    if (tab === 'trust' && !showTrustTab && showOverviewTab) {
      setTab('overview');
      return;
    }
    if (tab === 'trust' && !showTrustTab && !showOverviewTab && showContentTab) {
      setTab('content');
      return;
    }
    if (tab === 'content' && !showContentTab && showOverviewTab) {
      setTab('overview');
      return;
    }
    if (tab === 'content' && !showContentTab && !showOverviewTab && showTrustTab) {
      setTab('trust');
    }
  }, [tab, showOverviewTab, showTrustTab, showContentTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (isGuest || !user) {
    return (
      <GradientBackground>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <AuthHeader title="İçgörüler & Güven" showBack />
          <GlassCard style={styles.emptyCard}>
            <Text variant="h3">Oturum gerekli</Text>
            <Text secondary>İstatistiklerinizi görmek için giriş yapmalısınız.</Text>
            <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login' as Href)} />
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    );
  }

  const isPremium = profile ? hasPremiumEntitlement(profile.isPremium) : false;
  const showPremiumGate = subscriptionsCommerceEnabled();

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={INSIGHTS_ACCENT} />
        }
      >
        <AuthHeader
          title="İçgörüler & Güven"
          subtitle="Performans, kitle ve itibarınız"
          showBack
        />

        {loading || !profile || !stats ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={INSIGHTS_ACCENT} size="large" />
            <Text secondary variant="caption">
              Verileriniz yükleniyor…
            </Text>
          </View>
        ) : (
          <>
            <InsightsTabBar value={tab} onChange={setTab} />

            {tab === 'overview' && showOverviewTab ? (
              <View style={styles.tabContent}>
                <InsightsHeroCard
                  trustScore={profile.trustScore}
                  verifiedCount={profile.verifiedContentCount}
                  contributionScore={profile.contributionScore}
                />
                <Text variant="label" style={styles.blockTitle}>
                  Etkileşim özeti
                </Text>
                <InsightsQuickMetrics stats={stats} />
                <TrustVacationPromoSlot placement="insights" currentScore={profile.trustScore} />
              </View>
            ) : null}

            {tab === 'trust' && showTrustTab ? (
              <View style={styles.tabContent}>
                <GlassCard style={styles.sectionCard}>
                  <SectionIntro
                    icon="ribbon"
                    title="İtibar detayları"
                    subtitle="Doğrulanmış içerik ve muhabir seviyeniz"
                    accent={colors.primary}
                  />
                  <TrustStatsCard profile={profile} layout="section" hideTrustScore />
                </GlassCard>

                <WalletLinkRow />

                {showTrustRules ? (
                <ProfileCollapsibleSection
                  title="Puan kuralları"
                  icon="list"
                  iconColor={colors.primary}
                >
                  <TrustEarnRulesCard />
                </ProfileCollapsibleSection>
                ) : null}
              </View>
            ) : null}

            {tab === 'content' && showContentTab ? (
              showPremiumGate ? (
                <FeatureGate featureId="premium">
                  {isPremium ? (
                    <PremiumInsightsSections
                      stats={stats}
                      onOpenViewers={() => setViewersOpen(true)}
                      showProfileViewers={showProfileViewers}
                      showContentStats={showContentStats}
                      showContentDemographics={showContentDemographics}
                    />
                  ) : (
                    <PremiumInsightsUpsell />
                  )}
                </FeatureGate>
              ) : (
                <PremiumInsightsSections
                  stats={stats}
                  onOpenViewers={() => setViewersOpen(true)}
                  showProfileViewers={showProfileViewers}
                  showContentStats={showContentStats}
                  showContentDemographics={showContentDemographics}
                />
              )
            ) : null}
          </>
        )}
      </ScrollView>

      {profile ? (
        <ProfileViewersSheet
          profileId={profile.id}
          isPremium={hasPremiumEntitlement(profile.isPremium)}
          visible={viewersOpen}
          onClose={() => setViewersOpen(false)}
        />
      ) : null}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyCard: { gap: spacing.md },
  tabContent: { gap: spacing.md },
  blockTitle: { marginBottom: -spacing.xs },
  sectionCard: { gap: spacing.md },
  sectionIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: { flex: 1, gap: 2 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCopy: { flex: 1, gap: 2 },
  upsellCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  upsellIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
