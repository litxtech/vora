import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  PLATFORM_SUPPORT_DISCLAIMERS,
  PLATFORM_SUPPORT_PACKAGES,
  type PlatformSupportTier,
} from '@/features/platform-support/constants';
import {
  fetchUserContributions,
  startPlatformSupportCheckout,
} from '@/features/platform-support/services/contributionCheckout';
import type { PlatformContribution } from '@/features/platform-support/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const SUPPORT_ACCENT = '#10B981';
const SUPPORT_ACCENT_DARK = '#059669';

function tierLabel(tier: PlatformSupportTier): string {
  return PLATFORM_SUPPORT_PACKAGES.find((pkg) => pkg.id === tier)?.label ?? tier;
}

function formatAmount(cents: number, currency: string): string {
  const amount = cents / 100;
  if (currency.toLowerCase() === 'try') {
    return `₺${amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
  }
  return `${amount} ${currency.toUpperCase()}`;
}

export function ContributeScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const [selectedTier, setSelectedTier] = useState<PlatformSupportTier>('supporter_259');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<PlatformContribution[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    const rows = await fetchUserContributions(user.id);
    setHistory(rows);
    setHistoryLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (checkout === 'success') {
      void loadHistory();
      Alert.alert(
        'Teşekkürler',
        'Platform desteğiniz alındı. Profilinizde Destekçi rozeti kısa süre içinde görünecek.',
      );
      router.setParams({ checkout: undefined } as never);
    } else if (checkout === 'cancelled') {
      router.setParams({ checkout: undefined } as never);
    }
  }, [checkout, loadHistory]);

  const handleContribute = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await startPlatformSupportCheckout(selectedTier);
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    await loadHistory();
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader
          title="Uygulamaya Katkıda Bulun"
          subtitle="Gönüllü platform desteği"
          showBack
        />

        {authLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={SUPPORT_ACCENT} size="large" />
          </View>
        ) : !user ? (
          <GlassCard style={styles.card}>
            <Text variant="h3">Oturum gerekli</Text>
            <Text secondary>Platform desteği için giriş yapmalısınız.</Text>
            <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          </GlassCard>
        ) : (
          <>
            <View style={styles.heroWrap}>
              <LinearGradient
                colors={
                  isDark
                    ? (['#0F2922', '#0A1F18', '#121820'] as const)
                    : (['#ECFDF5', '#A7F3D0', '#D1FAE5'] as const)
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={[styles.heroIconRing, { borderColor: `${SUPPORT_ACCENT}66` }]}>
                  <Ionicons name="heart" size={36} color={SUPPORT_ACCENT} />
                </View>
                <Text variant="h2" style={[styles.heroTitle, { color: isDark ? '#D1FAE5' : '#065F46' }]}>
                  Vora&apos;ya Destek Ol
                </Text>
                <Text
                  variant="caption"
                  style={[styles.heroDesc, { color: isDark ? '#6EE7B7' : '#047857' }]}
                >
                  Gönüllü bağışınız platformun gelişmesine ve sürdürülmesine yardımcı olur
                </Text>
              </LinearGradient>
            </View>

            <GlassCard style={styles.card}>
              <Text variant="label">Destek paketi seç</Text>
              <View style={styles.packages}>
                {PLATFORM_SUPPORT_PACKAGES.map((pkg) => {
                  const selected = selectedTier === pkg.id;
                  return (
                    <Pressable
                      key={pkg.id}
                      onPress={() => setSelectedTier(pkg.id)}
                      style={[
                        styles.package,
                        {
                          borderColor: selected ? SUPPORT_ACCENT : colors.border,
                          backgroundColor: selected
                            ? `${SUPPORT_ACCENT}${isDark ? '18' : '22'}`
                            : colors.surfaceElevated,
                        },
                      ]}
                    >
                      <View style={styles.packageHeader}>
                        <Text variant="label">{pkg.label}</Text>
                        {pkg.badge ? (
                          <View style={[styles.packageBadge, { backgroundColor: `${SUPPORT_ACCENT}33` }]}>
                            <Text variant="caption" style={{ color: SUPPORT_ACCENT_DARK, fontSize: 10 }}>
                              {pkg.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text variant="h3" style={{ color: SUPPORT_ACCENT_DARK }}>
                        {pkg.price}
                      </Text>
                      <Text secondary variant="caption">
                        {pkg.description}
                      </Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={SUPPORT_ACCENT}
                          style={styles.packageCheck}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <Button
                title={loading ? "Stripe'a yönlendiriliyor..." : 'Stripe ile Destekle'}
                onPress={handleContribute}
                disabled={loading}
                style={{ backgroundColor: SUPPORT_ACCENT_DARK, borderColor: SUPPORT_ACCENT_DARK }}
              />

              <View style={styles.disclaimers}>
                {PLATFORM_SUPPORT_DISCLAIMERS.map((line) => (
                  <View key={line} style={styles.disclaimerRow}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                    <Text secondary variant="caption" style={styles.disclaimerText}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator color={colors.textMuted} size="small" />
              </View>
            ) : history.length > 0 ? (
              <GlassCard style={styles.card}>
                <Text variant="label">Önceki destekleriniz</Text>
                {history.map((item) => (
                  <View key={item.id} style={[styles.historyRow, { borderColor: colors.border }]}>
                    <View style={styles.historyLeft}>
                      <Ionicons name="heart-circle" size={18} color={SUPPORT_ACCENT} />
                      <Text variant="body">{tierLabel(item.tier)}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text variant="body" style={{ fontWeight: '600' }}>
                        {formatAmount(item.amountCents, item.currency)}
                      </Text>
                      {item.completedAt ? (
                        <Text secondary variant="caption">
                          {new Date(item.completedAt).toLocaleDateString('tr-TR')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </GlassCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  heroWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  heroGradient: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  heroIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  heroTitle: {
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heroDesc: {
    textAlign: 'center',
    lineHeight: 18,
  },
  card: { gap: spacing.md },
  packages: { flexDirection: 'row', gap: spacing.sm },
  package: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 120,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  packageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  packageCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  disclaimers: { gap: spacing.sm },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  disclaimerText: { flex: 1, lineHeight: 18 },
  historyLoading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
