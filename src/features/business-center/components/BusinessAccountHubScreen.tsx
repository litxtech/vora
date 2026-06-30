import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { BusinessHubHero } from '@/features/business-center/components/BusinessHubHero';
import { BusinessHubQuickStrip } from '@/features/business-center/components/BusinessHubQuickStrip';
import { BusinessHubTile } from '@/features/business-center/components/BusinessHubTile';
import { BusinessShopSectionHeader } from '@/features/business-center/components/BusinessShopSectionHeader';
import {
  BUSINESS_ACCENT,
  BUSINESS_GRADIENT,
  BUSINESS_ROUTES,
  businessCommissionContextFromAccount,
  businessCommissionPolicySummary,
  commerceModeShowsHotels,
  commerceModeShowsProducts,
  commerceModeIsShowcase,
  businessSectorLabel,
  formatCommissionRatePct,
  isBusinessGrowthPeriod,
  resolveBusinessCommissionRate,
  shopAccentColor,
} from '@/features/business-center/constants';
import { fetchBusinessHubStats } from '@/features/business-center/services/businessAccountData';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import type { BusinessAccountRecord, BusinessHubStats } from '@/features/business-center/types';
import { AccountLinkStatusCard } from '@/features/account-switch/components/AccountLinkStatusCard';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { formatCents } from '@/features/marketplace/constants';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { BUSINESS_FEATURE } from '@/features/business-center/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const EMPTY_STATS: BusinessHubStats = {
  productCount: 0,
  activeProducts: 0,
  hotelCount: 0,
  netEarningsCents: 0,
  pendingPayoutCents: 0,
  reservationCount: 0,
};

export function BusinessAccountHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isVisible } = useFeatureFlags();
  const { user, profile } = useAuth();
  const {
    linkedSibling,
    outgoingPendingUsername,
    outgoingPendingRequestId,
    outgoingPendingTargetUserId,
  } = useAccountSwitch();
  const [business, setBusiness] = useState<BusinessAccountRecord | null>(null);
  const [stats, setStats] = useState<BusinessHubStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const account = await fetchBusinessAccountByOwner(user.id);
    setBusiness(account);

    if (account?.registrationStatus === 'approved') {
      const hubStats = await fetchBusinessHubStats(user.id, profile?.region_id ?? null);
      setStats(hubStats);
    } else {
      setStats(EMPTY_STATS);
    }
    setLoading(false);
  }, [user?.id, profile?.region_id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!loading && business?.registrationStatus === 'pending') {
      router.replace(BUSINESS_ROUTES.pending as never);
    }
  }, [loading, business?.registrationStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!user) return null;

  if (!loading && !business) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.md }]}>
          <AuthHeader title="İşletme Paneli" subtitle="Kurumsal hesap bulunamadı" />
          <Text secondary>İşletme kaydı tamamlanmamış görünüyor.</Text>
        </View>
      </GradientBackground>
    );
  }

  if (!loading && business?.registrationStatus === 'pending') {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={BUSINESS_ACCENT} />
        </View>
      </GradientBackground>
    );
  }

  if (!loading && business?.registrationStatus === 'rejected') {
    return (
      <GradientBackground>
        <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <AuthHeader title="Başvuru Reddedildi" subtitle="Kurumsal hesap onaylanmadı" />
          <GlassCard>
            <Text secondary>
              İşletme başvurunuz reddedildi. Belgelerinizi güncelleyip destek ekibiyle iletişime geçebilirsiniz.
            </Text>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    );
  }

  const accent = shopAccentColor(business?.shopAccent);
  const showProducts = business ? commerceModeShowsProducts(business.commerceMode) : false;
  const showHotels = business ? commerceModeShowsHotels(business.commerceMode) : false;
  const showShowcase = business ? commerceModeIsShowcase(business.commerceMode) : false;
  const needsSetup = business && (business.commerceMode === 'none' || !business.shopPublished);
  const commissionContext = business ? businessCommissionContextFromAccount(business) : null;
  const productRatePct = commissionContext
    ? formatCommissionRatePct(resolveBusinessCommissionRate('product', commissionContext))
    : null;
  const hotelRatePct = commissionContext
    ? formatCommissionRatePct(resolveBusinessCommissionRate('hotel', commissionContext))
    : null;

  const quickItems = business
    ? [
        ...(business.shopPublished
          ? [
              {
                key: 'shop',
                featureId: BUSINESS_FEATURE.quick.shopView,
                icon: 'eye-outline' as const,
                label: 'Mağazayı gör',
                accent,
                onPress: () => router.push(BUSINESS_ROUTES.shop(business.id) as never),
              },
            ]
          : []),
        {
          key: 'curate',
          featureId: BUSINESS_FEATURE.quick.curate,
          icon: 'grid-outline' as const,
          label: 'Vitrin düzenle',
          accent,
          onPress: () => router.push(BUSINESS_ROUTES.shopCurate as never),
        },
        {
          key: 'edit',
          featureId: BUSINESS_FEATURE.quick.edit,
          icon: 'create-outline' as const,
          label: 'Profil & logo',
          accent: '#FFB300',
          onPress: () => router.push(BUSINESS_ROUTES.edit as never),
        },
        {
          key: 'payout',
          featureId: BUSINESS_FEATURE.quick.payout,
          icon: 'card-outline' as const,
          label: 'Ödeme profili',
          accent: '#5C6BC0',
          onPress: () => router.push(BUSINESS_ROUTES.payout as never),
        },
      ].filter((item) => isVisible(item.featureId))
    : [];

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        {loading && !refreshing ? (
          <View style={{ paddingTop: insets.top + spacing.xxl }}>
            <ActivityIndicator color={accent} />
          </View>
        ) : business ? (
          <>
            <BusinessHubHero
              business={business}
              stats={stats}
              accent={accent}
              topInset={insets.top}
              onBack={() => router.back()}
            />

            <Animated.View entering={FadeInUp.delay(80).duration(380)} style={styles.block}>
              <BusinessHubQuickStrip items={quickItems} />
            </Animated.View>

            {needsSetup && isVisible(BUSINESS_FEATURE.section.setupBanner) ? (
              <Animated.View entering={FadeInUp.delay(120).duration(380)}>
                <Pressable onPress={() => router.push(BUSINESS_ROUTES.setup as never)}>
                  <LinearGradient
                    colors={[`${BUSINESS_GRADIENT[0]}EE`, `${BUSINESS_GRADIENT[1]}BB`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.setupBanner}
                  >
                    <View style={styles.setupIcon}>
                      <Ionicons name="rocket-outline" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="label" style={{ color: '#fff', fontWeight: '900' }}>
                        Mağazanızı yayına alın
                      </Text>
                      <Text variant="caption" style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 17 }}>
                        E-ticaret veya otel modunu seçin, canlı vitrini açın.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ) : null}

            {business.shopPublished ? (
              <Animated.View entering={FadeInUp.delay(160).duration(380)} style={styles.block}>
                <BusinessShopSectionHeader title="Mağaza vitrini" accent={accent} showLive />
                <View style={styles.shopActions}>
                  {isVisible(BUSINESS_FEATURE.section.showcaseShop) ? (
                    <ShopActionCard
                      icon="eye-outline"
                      title="Müşteri görünümü"
                      subtitle="Canlı Instagram vitrin"
                      accent={accent}
                      onPress={() => router.push(BUSINESS_ROUTES.shop(business.id) as never)}
                    />
                  ) : null}
                  {isVisible(BUSINESS_FEATURE.section.showcaseCurate) ? (
                    <ShopActionCard
                      icon="options-outline"
                      title="Vitrin yönetimi"
                      subtitle="Sıra · görünürlük · düzenle"
                      accent={accent}
                      onPress={() => router.push(BUSINESS_ROUTES.shopCurate as never)}
                    />
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(200).duration(380)} style={styles.block}>
              <HubSection title="Mağaza & satış">
                <View style={styles.tileGrid}>
                  {showProducts ? (
                    <>
                      {isVisible(BUSINESS_FEATURE.section.createProduct) ? (
                        <BusinessHubTile
                          icon="add-circle-outline"
                          title="Ürün ekle"
                          detail="Stripe güvenli ödeme"
                          accent={accent}
                          onPress={() => router.push(BUSINESS_ROUTES.createProduct as never)}
                        />
                      ) : null}
                      {isVisible(BUSINESS_FEATURE.section.myProducts) ? (
                        <BusinessHubTile
                          icon="pricetags-outline"
                          title="Ürünlerim"
                          detail={`${stats.activeProducts} yayında`}
                          accent={accent}
                          onPress={() => router.push('/marketplace-center/my-listings' as never)}
                        />
                      ) : null}
                      {isVisible(BUSINESS_FEATURE.section.sales) ? (
                        <BusinessHubTile
                          icon="trending-up-outline"
                          title="Satışlar"
                          detail={formatCents(stats.netEarningsCents)}
                          accent="#43A047"
                          onPress={() => router.push('/marketplace-center/seller' as never)}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {showHotels ? (
                    <>
                      {isVisible(BUSINESS_FEATURE.section.hotelManage) ? (
                        <BusinessHubTile
                          icon="bed-outline"
                          title="Otel yönetimi"
                          detail={`${stats.hotelCount} kayıt`}
                          accent="#5C6BC0"
                          onPress={() => router.push(BUSINESS_ROUTES.hotelManage as never)}
                        />
                      ) : null}
                      {isVisible(BUSINESS_FEATURE.section.hotelReservations) ? (
                        <BusinessHubTile
                          icon="calendar-outline"
                          title="Rezervasyonlar"
                          detail={`${stats.reservationCount} kayıt`}
                          accent="#5C6BC0"
                          onPress={() => router.push(BUSINESS_ROUTES.hotelReservations as never)}
                        />
                      ) : null}
                      {isVisible(BUSINESS_FEATURE.section.hotelEarnings) ? (
                        <BusinessHubTile
                          icon="wallet-outline"
                          title="Otel kazançları"
                          detail="Ödeme takibi"
                          accent="#00897B"
                          onPress={() => router.push(BUSINESS_ROUTES.hotelEarnings as never)}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {showShowcase ? (
                    <>
                      {isVisible(BUSINESS_FEATURE.section.showcaseShop) ? (
                        <BusinessHubTile
                          icon="storefront-outline"
                          title="Kurumsal vitrin"
                          detail={businessSectorLabel(business.category)}
                          accent={accent}
                          onPress={() => router.push(BUSINESS_ROUTES.shop(business.id) as never)}
                        />
                      ) : null}
                      {isVisible(BUSINESS_FEATURE.section.showcaseCurate) ? (
                        <BusinessHubTile
                          icon="grid-outline"
                          title="Vitrin düzenle"
                          detail="Sıralama · görünürlük"
                          accent={accent}
                          onPress={() => router.push(BUSINESS_ROUTES.shopCurate as never)}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {!showProducts && !showHotels && !showShowcase && isVisible(BUSINESS_FEATURE.section.shopSetup) ? (
                    <BusinessHubTile
                      icon="settings-outline"
                      title="Mağaza kurulumu"
                      detail="Sektör seçin · vitrin modunu açın"
                      accent={accent}
                      wide
                      onPress={() => router.push(BUSINESS_ROUTES.setup as never)}
                    />
                  ) : null}
                </View>
              </HubSection>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(240).duration(380)} style={styles.block}>
              <HubSection title="Pazarlama & operasyon">
                <View style={styles.tileGrid}>
                  {isVisible(BUSINESS_FEATURE.section.ads) ? (
                    <BusinessHubTile
                      icon="megaphone-outline"
                      title="Reklam stüdyosu"
                      detail="Feed · harita · reels"
                      accent="#FF8F00"
                      onPress={() => router.push(BUSINESS_ROUTES.ads as never)}
                    />
                  ) : null}
                  {isVisible(BUSINESS_FEATURE.section.shopBoost) ? (
                    <BusinessHubTile
                      icon="sparkles-outline"
                      title="Mağazayı öne çıkar"
                      detail="Keşfet · vitrin · sabit süre"
                      accent="#FF8F00"
                      onPress={() => router.push(BUSINESS_ROUTES.shopBoost as never)}
                    />
                  ) : null}
                  {isVisible(BUSINESS_FEATURE.section.campaigns) ? (
                    <BusinessHubTile
                      icon="gift-outline"
                      title="Kampanya"
                      detail="Profil duyurusu"
                      accent="#E91E63"
                      onPress={() => router.push(BUSINESS_ROUTES.campaigns as never)}
                    />
                  ) : null}
                  {isVisible(BUSINESS_FEATURE.section.announcements) ? (
                  <BusinessHubTile
                    icon="megaphone-outline"
                    title="Duyurularım"
                    detail="Akış üstü duyuru · okuyanlar"
                    accent="#1E88E5"
                    onPress={() => router.push('/announcements' as never)}
                  />
                  ) : null}
                  {isVisible(BUSINESS_FEATURE.section.personnel) ? (
                    <BusinessHubTile
                      icon="people-outline"
                      title="Personel & ilan"
                      detail="İş gücü merkezi"
                      accent={colors.primary}
                      onPress={() => router.push(BUSINESS_ROUTES.personnel as never)}
                    />
                  ) : null}
                  {isVisible(BUSINESS_FEATURE.section.shopSettings) ? (
                    <BusinessHubTile
                      icon="storefront-outline"
                      title="Mağaza ayarları"
                      detail="Mod · slogan · yayın"
                      accent={accent}
                      onPress={() => router.push(BUSINESS_ROUTES.setup as never)}
                    />
                  ) : null}
                </View>
              </HubSection>
            </Animated.View>

            {commissionContext ? (
              <Animated.View entering={FadeInUp.delay(280).duration(380)} style={styles.block}>
                <GlassCard style={styles.commissionCard}>
                  <View style={styles.commissionHead}>
                    <Ionicons name="pie-chart-outline" size={18} color={accent} />
                    <Text variant="label">Komisyon oranlarınız</Text>
                  </View>
                  <Text secondary variant="caption">
                    {businessCommissionPolicySummary(commissionContext)}
                  </Text>
                  <View style={styles.commissionRow}>
                    {showProducts && productRatePct != null ? (
                      <CommissionChip label={`Ürün %${productRatePct}`} accent={accent} />
                    ) : null}
                    {showHotels && hotelRatePct != null ? (
                      <CommissionChip label={`Otel %${hotelRatePct}`} accent="#5C6BC0" />
                    ) : null}
                  </View>
                  {isBusinessGrowthPeriod(commissionContext.registrationApprovedAt) ? (
                    <View style={[styles.growthPill, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}>
                      <Ionicons name="sparkles-outline" size={14} color={accent} />
                      <Text variant="caption" style={{ color: accent, fontWeight: '700', flex: 1 }}>
                        Büyüme teşviki aktif — onay sonrası ilk 90 gün
                      </Text>
                    </View>
                  ) : null}
                </GlassCard>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(320).duration(380)} style={styles.block}>
              <HubSection title="Hesap & ödemeler">
                <AccountLinkStatusCard
                  accountType="business"
                  linkedSibling={linkedSibling}
                  outgoingPendingUsername={outgoingPendingUsername}
                  outgoingPendingRequestId={outgoingPendingRequestId}
                  outgoingPendingTargetUserId={outgoingPendingTargetUserId}
                  compact
                />
                {isVisible(BUSINESS_FEATURE.section.payoutProfile) ? (
                  <Pressable onPress={() => router.push(BUSINESS_ROUTES.payout as never)}>
                    <GlassCard style={styles.payoutCard}>
                      <LinearGradient
                        colors={[`#5C6BC014`, `${colors.surface}00`]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={[styles.payoutIcon, { backgroundColor: '#5C6BC018' }]}>
                        <Ionicons name="card-outline" size={22} color="#5C6BC0" />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text variant="label">IBAN & Stripe ödeme profili</Text>
                        <Text secondary variant="caption">
                          Satış ve rezervasyon gelirlerinin yatırılacağı hesap
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </GlassCard>
                  </Pressable>
                ) : null}
                {isVisible(BUSINESS_FEATURE.section.editBusiness) ? (
                  <Button
                    title="İşletme bilgilerini düzenle"
                    variant="secondary"
                    size="compact"
                    onPress={() => router.push(BUSINESS_ROUTES.edit as never)}
                  />
                ) : null}
              </HubSection>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

function HubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <BusinessShopSectionHeader title={title} showLive={false} />
      {children}
    </View>
  );
}

function ShopActionCard({
  icon,
  title,
  subtitle,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shopCard,
        {
          borderColor: `${accent}40`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.shopCardIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" style={{ fontWeight: '800' }}>
          {title}
        </Text>
        <Text secondary variant="caption">
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function CommissionChip({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={[styles.commissionChip, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}>
      <Text variant="caption" style={{ color: accent, fontWeight: '800' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  centered: { flex: 1, padding: spacing.lg, gap: spacing.md },
  block: { marginTop: spacing.lg, gap: spacing.sm },
  section: { gap: spacing.sm },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  setupIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopActions: { gap: spacing.sm },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  shopCardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  commissionCard: { gap: spacing.sm, overflow: 'hidden' },
  commissionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commissionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  commissionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  growthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  payoutIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
