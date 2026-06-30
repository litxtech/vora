import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  AD_BILLING_MODE_LABELS,
  AD_CPC_CENTS,
  AD_SESSION_HOURS,
  AD_STATUS_LABELS,
  adTypeMeta,
  computeCtr,
  ctaLabelText,
  formatAdDate,
  formatAdRegions,
  formatAdRemaining,
  formatBudget,
  formatCpcKurus,
  isAdExpired,
} from '@/features/ads/constants';
import { deleteAd, fetchAdById, restartBusinessAd, updateAdStatus } from '@/features/ads/services/adData';
import { fetchAdWalletSummary } from '@/features/ads/services/adWallet';
import type { AdWalletSummary, BusinessAd } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function AdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [ad, setAd] = useState<BusinessAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<AdWalletSummary | null>(null);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [result, w] = await Promise.all([fetchAdById(id, user.id), fetchAdWalletSummary()]);
    setAd(result.ad);
    setError(result.error);
    setWallet(w);
  }, [id, user]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const runStatus = async (status: BusinessAd['status'], successMessage: string) => {
    if (!user || !ad) return;
    setActing(true);
    const { error: statusError } = await updateAdStatus(ad.id, user.id, status);
    setActing(false);
    if (statusError) {
      Alert.alert('Hata', statusError);
      return;
    }
    Alert.alert('Tamam', successMessage);
    await load();
  };

  const handlePause = () => {
    Alert.alert('Reklamı duraklat', 'Reklam yayınlanmayı durdurur; istediğiniz zaman devam ettirebilirsiniz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Duraklat', onPress: () => void runStatus('paused', 'Reklam duraklatıldı.') },
    ]);
  };

  const handleResume = () => {
    void runStatus('active', 'Reklam yayına devam ediyor.');
  };

  const handleRestart = () => {
    if (!ad) return;
    const balanceNote =
      wallet && wallet.balanceCents < wallet.cpcCents
        ? `\n\nCüzdan bakiyeniz yetersiz; en az ${formatCpcKurus(AD_CPC_CENTS)} gerekir.`
        : `\n\nTıklamalar cüzdanınızdan ${formatCpcKurus(AD_CPC_CENTS)} düşülür.`;

    Alert.alert(
      '24 saat yeniden başlat',
      `Reklam ${AD_SESSION_HOURS} saat daha yayınlanır.${balanceNote}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Başlat',
          onPress: async () => {
            setActing(true);
            const { error: restartError } = await restartBusinessAd(ad.id);
            setActing(false);
            if (restartError) {
              Alert.alert('Hata', restartError);
              return;
            }
            Alert.alert('Tamam', `Reklam 24 saat yayına alındı. Tıklama başı ${formatCpcKurus(AD_CPC_CENTS)}.`);
            await load();
          },
        },
      ],
    );
  };

  const handleEnd = () => {
    Alert.alert(
      'Erken sonlandır',
      'Reklam hemen kapanır. Yeniden yayınlamak için 24 saatlik oturum başlatmanız gerekir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: () => void runStatus('ended', 'Reklam sonlandırıldı.'),
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!user || !ad) return;
    if (ad.status === 'active') {
      Alert.alert('Önce durdurun', 'Aktif reklamı silmeden önce duraklatın veya sonlandırın.');
      return;
    }

    Alert.alert('Reklamı sil', 'Bu işlem geri alınamaz. Reklam kalıcı olarak silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          const { error: deleteError } = await deleteAd(ad.id, user.id);
          setActing(false);
          if (deleteError) {
            Alert.alert('Hata', deleteError);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (!ad || error) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg }]}>
          <ScreenBackButton style={{ marginBottom: spacing.md }} />
          <Text variant="h3">Reklam bulunamadı</Text>
          <Text secondary variant="caption" style={styles.centerText}>
            {error ?? 'Bu reklama erişiminiz yok veya kaldırılmış olabilir.'}
          </Text>
        </View>
      </GradientBackground>
    );
  }

  const meta = adTypeMeta(ad.adType);
  const expired = isAdExpired(ad);
  const statusColor =
    ad.status === 'active' && !expired
      ? colors.success
      : ad.status === 'pending'
        ? colors.warning
        : colors.textMuted;
  const budgetRemaining = Math.max(ad.budgetCents - ad.spentCents, 0);
  const canPause = ad.status === 'active' && !expired;
  const canResume = ad.status === 'paused' && !expired;
  const canRestart = ad.status === 'ended' || expired;
  const canEnd = (ad.status === 'active' || ad.status === 'paused') && !expired;
  const remainingLabel = formatAdRemaining(ad.endsAt);
  const ageLabel =
    ad.targetAgeMin != null
      ? `${ad.targetAgeMin}–${ad.targetAgeMax ?? '+'} yaş`
      : 'Tüm yaş grupları';

  return (
    <GradientBackground>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <AuthHeader compact title={ad.title} subtitle={meta.label} />

        <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
            {expired && ad.status !== 'ended' ? 'Süresi doldu' : (AD_STATUS_LABELS[ad.status] ?? ad.status)}
          </Text>
          {remainingLabel && ad.status === 'active' ? (
            <Text variant="caption" secondary style={{ fontSize: 11 }}>
              · {remainingLabel}
            </Text>
          ) : null}
        </View>

        <Text secondary variant="caption" style={styles.sessionHint}>
          Her oturum {AD_SESSION_HOURS} saat sürer. Tıklama başı {formatCpcKurus(AD_CPC_CENTS)} cüzdanınızdan düşülür.
        </Text>

        {ad.imageUrl ? (
          <Image source={{ uri: ad.imageUrl }} style={styles.heroImage} contentFit="cover" />
        ) : null}

        <GlassCard padded={false} style={styles.section}>
          <View style={styles.sectionInner}>
            <Text variant="label">Performans</Text>
            <View style={styles.statGrid}>
              <StatBox
                label="Görüntülenme"
                value={ad.impressions.toLocaleString('tr-TR')}
                icon="eye-outline"
                colors={colors}
              />
              <StatBox
                label="Tıklama"
                value={ad.clicks.toLocaleString('tr-TR')}
                icon="hand-left-outline"
                colors={colors}
              />
              <StatBox label="CTR" value={computeCtr(ad.impressions, ad.clicks)} icon="analytics-outline" colors={colors} />
              <StatBox
                label="Harcama"
                value={formatBudget(ad.spentCents)}
                icon="wallet-outline"
                colors={colors}
              />
              <StatBox
                label="Tıklamada işlem"
                value={ctaLabelText(ad.ctaLabel)}
                icon="megaphone-outline"
                colors={colors}
              />
              <StatBox
                label="Tıklama başı"
                value={formatCpcKurus(ad.cpcCents || AD_CPC_CENTS)}
                icon="finger-print-outline"
                colors={colors}
              />
            </View>
          </View>
        </GlassCard>

        <GlassCard padded={false} style={styles.section}>
          <View style={styles.sectionInner}>
            <Text variant="label">Hedef kitle</Text>
            <DetailRow icon="location-outline" label="Bölgeler" value={formatAdRegions(ad.targetRegionIds)} />
            <DetailRow
              icon="navigate-outline"
              label="İlçe"
              value={ad.targetDistrict?.trim() || 'Tüm ilçeler'}
            />
            <DetailRow icon="people-outline" label="Yaş" value={ageLabel} />
            <DetailRow
              icon="heart-outline"
              label="İlgi alanları"
              value={ad.targetInterests.length ? ad.targetInterests.join(', ') : 'Belirtilmedi'}
            />
          </View>
        </GlassCard>

        <GlassCard padded={false} style={styles.section}>
          <View style={styles.sectionInner}>
            <Text variant="label">Bütçe & faturalama</Text>
            <DetailRow
              icon="pricetag-outline"
              label="Model"
              value={AD_BILLING_MODE_LABELS[ad.billingMode] ?? ad.billingMode}
            />
            <DetailRow icon="cash-outline" label="Bütçe tavanı" value={formatBudget(ad.budgetCents)} />
            <DetailRow icon="trending-down-outline" label="Harcanan" value={formatBudget(ad.spentCents)} />
            <DetailRow icon="save-outline" label="Kalan" value={formatBudget(budgetRemaining)} />
            <DetailRow
              icon="finger-print-outline"
              label="Tıklama ücreti"
              value={formatCpcKurus(ad.cpcCents || AD_CPC_CENTS)}
            />
          </View>
        </GlassCard>

        <GlassCard padded={false} style={styles.section}>
          <View style={styles.sectionInner}>
            <Text variant="label">Yerleşim & zaman</Text>
            <DetailRow icon={meta.icon} label="Yerleşim" value={meta.label} />
            <DetailRow icon="play-outline" label="Başlangıç" value={formatAdDate(ad.startsAt)} />
            <DetailRow icon="stop-outline" label="Bitiş" value={formatAdDate(ad.endsAt)} />
            <DetailRow icon="calendar-outline" label="Oluşturulma" value={formatAdDate(ad.createdAt)} />
          </View>
        </GlassCard>

        <GlassCard padded={false} style={styles.section}>
          <View style={styles.sectionInner}>
            <Text variant="label">İçerik</Text>
            <Text secondary variant="caption" style={styles.description}>
              {ad.description}
            </Text>
            <DetailRow icon="megaphone-outline" label="CTA" value={ctaLabelText(ad.ctaLabel)} />
            {ad.destinationUrl ? (
              <DetailRow icon="link-outline" label="Hedef URL" value={ad.destinationUrl} />
            ) : null}
          </View>
        </GlassCard>

        <View style={styles.actions}>
          {canPause ? (
            <Button title="Duraklat" variant="outline" size="compact" loading={acting} onPress={handlePause} />
          ) : null}
          {canResume ? (
            <Button title="Devam ettir" size="compact" loading={acting} onPress={handleResume} />
          ) : null}
          {canRestart ? (
            <Button title="24 saat yeniden başlat" size="compact" loading={acting} onPress={handleRestart} />
          ) : null}
          {canEnd ? (
            <Button title="Erken sonlandır" variant="secondary" size="compact" loading={acting} onPress={handleEnd} />
          ) : null}
          {ad.status !== 'active' ? (
            <Button title="Sil" variant="danger" size="compact" loading={acting} onPress={handleDelete} />
          ) : null}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

function StatBox({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text variant="caption" secondary style={{ fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="caption" style={{ fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text variant="caption" secondary style={styles.detailLabel}>
        {label}
      </Text>
      <Text variant="caption" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  sessionHint: {
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  heroImage: {
    width: '100%',
    height: 140,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: 0,
  },
  sectionInner: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    width: '47%',
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(127,127,127,0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  detailLabel: {
    width: 88,
    fontSize: 11,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  description: {
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
