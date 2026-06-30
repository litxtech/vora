import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  SHOP_BOOST_ACCENT,
  SHOP_BOOST_PACKAGES,
  SHOP_BOOST_SCOPE_OPTIONS,
  computeShopBoostPrice,
  formatShopBoostPrice,
  formatShopBoostRemaining,
  isBusinessGrowthPeriod,
  shopBoostScopeLabel,
  shopBoostTierLabel,
} from '@/features/business-center/constants';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import {
  fetchBusinessShopBoostStatus,
  fetchShopBoostSlots,
  startShopBoostCheckout,
} from '@/features/business-center/services/shopBoostData';
import type { BusinessAccountRecord, ShopBoostScope, ShopBoostTier } from '@/features/business-center/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BusinessShopBoostScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const [business, setBusiness] = useState<BusinessAccountRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ShopBoostTier>('standard');
  const [selectedScope, setSelectedScope] = useState<ShopBoostScope>('region');
  const [slots, setSlots] = useState({ used: 0, max: 3, available: 3 });
  const [activeStatus, setActiveStatus] = useState<Awaited<ReturnType<typeof fetchBusinessShopBoostStatus>>>({
    active: false,
  });

  const growthEligible = isBusinessGrowthPeriod(business?.registrationApprovedAt ?? null);
  const pricing = useMemo(
    () => computeShopBoostPrice(selectedTier, selectedScope, growthEligible),
    [selectedTier, selectedScope, growthEligible],
  );

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const account = await fetchBusinessAccountByOwner(user.id);
    setBusiness(account);

    if (account?.id) {
      const [status, slotInfo] = await Promise.all([
        fetchBusinessShopBoostStatus(account.id),
        fetchShopBoostSlots('region', account.regionId),
      ]);
      setActiveStatus(status);
      setSlots(slotInfo);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!business?.regionId) return;
    void fetchShopBoostSlots(selectedScope, selectedScope === 'region' ? business.regionId : null).then(setSlots);
  }, [business?.regionId, selectedScope]);

  useEffect(() => {
    if (checkout === 'success') {
      void load();
      Alert.alert(
        'Ödeme alındı',
        'Mağazanız öne çıkarıldı. Keşfet ve Mağazalar vitrininde görünmeye başladınız.',
      );
      router.setParams({ checkout: undefined } as never);
    } else if (checkout === 'cancelled') {
      router.setParams({ checkout: undefined } as never);
    }
  }, [checkout, load]);

  const handlePay = async () => {
    if (!business) return;
    if (activeStatus.active) {
      Alert.alert('Aktif paket', 'Mağazanız zaten öne çıkarılmış durumda.');
      return;
    }
    if (slots.available <= 0) {
      Alert.alert('Slot dolu', 'Bu bölgede öne çıkarma slotları dolu. Lütfen daha sonra tekrar deneyin.');
      return;
    }
    if (!business.shopPublished || business.commerceMode === 'none') {
      Alert.alert('Mağaza gerekli', 'Önce mağazanızı kurup yayına alın.');
      return;
    }

    setPaying(true);
    const { error } = await startShopBoostCheckout(selectedTier, selectedScope);
    setPaying(false);
    if (error) Alert.alert('Ödeme başlatılamadı', error);
    else await load();
  };

  const shopReady = business?.shopPublished && business.commerceMode !== 'none';

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.lg,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title="Mağazayı Öne Çıkar"
          subtitle="Keşfet · Mağazalar vitrini · sabit süre"
          showBack
        />

        {loading ? (
          <ActivityIndicator color={SHOP_BOOST_ACCENT} style={{ marginTop: spacing.xl }} />
        ) : !user || !business ? (
          <GlassCard style={styles.card}>
            <Text variant="label">İşletme hesabı gerekli</Text>
            <Text secondary variant="caption">
              Bu özellik yalnızca onaylı işletme hesapları içindir.
            </Text>
          </GlassCard>
        ) : (
          <>
            {activeStatus.active ? (
              <GlassCard style={[styles.card, { borderColor: `${SHOP_BOOST_ACCENT}44` }]}>
                <View style={styles.activeHead}>
                  <Ionicons name="sparkles" size={20} color={SHOP_BOOST_ACCENT} />
                  <Text variant="label" style={{ color: SHOP_BOOST_ACCENT, fontWeight: '800' }}>
                    Mağazanız öne çıkarılmış
                  </Text>
                </View>
                <Text secondary variant="caption">
                  {shopBoostTierLabel(activeStatus.packageTier)} ·{' '}
                  {shopBoostScopeLabel(activeStatus.regionScope)}
                </Text>
                <Text variant="label" style={{ marginTop: spacing.xs }}>
                  {formatShopBoostRemaining(activeStatus.endsAt)}
                </Text>
                <Text secondary variant="caption" style={{ marginTop: spacing.sm }}>
                  {activeStatus.impressions.toLocaleString('tr-TR')} gösterim ·{' '}
                  {activeStatus.shopViews.toLocaleString('tr-TR')} mağaza ziyareti
                </Text>
              </GlassCard>
            ) : null}

            <LinearGradient
              colors={
                isDark
                  ? (['#2D1F00', '#1A1200', '#121820'] as const)
                  : (['#FFF7ED', '#FFEDD5', '#FEF3C7'] as const)
              }
              style={styles.hero}
            >
              <Ionicons name="storefront" size={28} color={SHOP_BOOST_ACCENT} />
              <Text variant="h3" style={{ fontWeight: '800' }}>
                {business.name}
              </Text>
              <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                Ödeme tamamlandığında vitrin otomatik başlar — keşfet, mağazalar listesi ve öne çıkan
                carousel&apos;de görünürsünüz.
              </Text>
            </LinearGradient>

            {!shopReady ? (
              <GlassCard style={styles.card}>
                <Text variant="label">Mağazayı önce yayına alın</Text>
                <Text secondary variant="caption">
                  Kurumsal vitrin veya e-ticaret modunu açıp mağazanızı yayınladıktan sonra öne çıkarabilirsiniz.
                </Text>
                <Button title="Mağaza kurulumu" onPress={() => router.push('/business-center/setup' as never)} />
              </GlassCard>
            ) : (
              <>
                <View style={styles.section}>
                  <Text variant="label">Paket</Text>
                  {SHOP_BOOST_PACKAGES.map((pkg) => {
                    const active = selectedTier === pkg.id;
                    const price = computeShopBoostPrice(pkg.id, selectedScope, growthEligible);
                    return (
                      <Pressable
                        key={pkg.id}
                        onPress={() => setSelectedTier(pkg.id)}
                        style={[
                          styles.option,
                          {
                            borderColor: active ? SHOP_BOOST_ACCENT : colors.border,
                            backgroundColor: active ? `${SHOP_BOOST_ACCENT}12` : colors.surface,
                          },
                        ]}
                      >
                        <View style={styles.optionHead}>
                          <Text variant="label" style={{ fontWeight: '800' }}>
                            {pkg.label} · {pkg.days} gün
                          </Text>
                          <Text variant="label" style={{ color: SHOP_BOOST_ACCENT, fontWeight: '800' }}>
                            {formatShopBoostPrice(price.totalCents)}
                          </Text>
                        </View>
                        <Text secondary variant="caption">
                          {pkg.subtitle}
                        </Text>
                        <Text secondary variant="caption" style={{ marginTop: 4 }}>
                          {pkg.placements.join(' · ')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.section}>
                  <Text variant="label">Kapsam</Text>
                  {SHOP_BOOST_SCOPE_OPTIONS.map((scope) => {
                    const active = selectedScope === scope.id;
                    return (
                      <Pressable
                        key={scope.id}
                        onPress={() => setSelectedScope(scope.id)}
                        style={[
                          styles.option,
                          {
                            borderColor: active ? SHOP_BOOST_ACCENT : colors.border,
                            backgroundColor: active ? `${SHOP_BOOST_ACCENT}12` : colors.surface,
                          },
                        ]}
                      >
                        <Text variant="label" style={{ fontWeight: '800' }}>
                          {scope.label}
                        </Text>
                        <Text secondary variant="caption">
                          {scope.subtitle}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <GlassCard style={styles.card}>
                  <View style={styles.summaryRow}>
                    <Text secondary>Slot durumu</Text>
                    <Text variant="label">
                      {slots.used}/{slots.max} dolu · {slots.available} boş
                    </Text>
                  </View>
                  {growthEligible ? (
                    <View style={[styles.growthPill, { backgroundColor: `${SHOP_BOOST_ACCENT}14` }]}>
                      <Ionicons name="sparkles-outline" size={14} color={SHOP_BOOST_ACCENT} />
                      <Text variant="caption" style={{ color: SHOP_BOOST_ACCENT, fontWeight: '700', flex: 1 }}>
                        Büyüme teşviki — %30 indirim uygulandı
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.summaryRow}>
                    <Text secondary>Liste fiyatı</Text>
                    <Text variant="caption">{formatShopBoostPrice(pricing.listCents)}</Text>
                  </View>
                  {pricing.discountCents > 0 ? (
                    <View style={styles.summaryRow}>
                      <Text secondary>İndirim</Text>
                      <Text variant="caption" style={{ color: SHOP_BOOST_ACCENT }}>
                        −{formatShopBoostPrice(pricing.discountCents)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.summaryRow}>
                    <Text variant="label">Ödenecek</Text>
                    <Text variant="h3" style={{ color: SHOP_BOOST_ACCENT, fontWeight: '800' }}>
                      {formatShopBoostPrice(pricing.totalCents)}
                    </Text>
                  </View>
                </GlassCard>

                {!activeStatus.active ? (
                  <Button
                    title={paying ? 'Ödeme açılıyor…' : 'Öde ve öne çıkar'}
                    onPress={() => void handlePay()}
                    disabled={paying || slots.available <= 0}
                  />
                ) : null}

                <Text secondary variant="caption" style={{ textAlign: 'center', lineHeight: 18 }}>
                  Ödeme Stripe ile güvenli alınır. Ödeme onaylandığında paket süreniz otomatik başlar; vitrin
                  ürünleriniz mağaza vitrin sıranızdan alınır.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  section: { gap: spacing.sm },
  option: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  optionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  growthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  activeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
