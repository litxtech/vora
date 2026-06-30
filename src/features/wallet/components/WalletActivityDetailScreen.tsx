import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { WalletActivityHeroCard } from '@/features/wallet/components/WalletActivityHeroCard';
import { getCachedWalletActivity } from '@/features/wallet/services/activityCache';
import { exportWalletActivityPdf } from '@/features/wallet/services/walletActivityPdf';
import type { WalletActivityItem } from '@/features/wallet/types';
import {
  formatActivityAmount,
  formatActivityFullDate,
  WALLET_ACTIVITY_STATUS_LABELS,
  WALLET_SECTOR_META,
} from '@/features/wallet/utils/activityLabels';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function WalletActivityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : undefined;
  const [exporting, setExporting] = useState(false);

  const item: WalletActivityItem | undefined = id ? getCachedWalletActivity(id) : undefined;

  const handlePdf = useCallback(async () => {
    if (!item) return;
    setExporting(true);
    const result = await exportWalletActivityPdf(item);
    setExporting(false);
    if (result.error) Alert.alert('PDF', result.error);
  }, [item]);

  if (!item) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <AuthHeader title="Hareket detayı" showBack />
          <GlassCard style={styles.missing}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.warning} />
            <Text variant="label">Hareket bulunamadı</Text>
            <Text variant="caption" secondary style={{ textAlign: 'center' }}>
              Kayıt süresi dolmuş olabilir. Cüzdan listesinden tekrar açın.
            </Text>
            <Button title="Cüzdana dön" onPress={() => router.back()} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const sector = WALLET_SECTOR_META[item.sector];
  const isCredit =
    item.currency === 'points' ? (item.pointsAmount ?? 0) >= 0 : (item.amountCents ?? 0) >= 0;
  const amountColor = item.currency === 'points' ? sector.accent : isCredit ? colors.success : colors.danger;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AuthHeader title="Hareket detayı" subtitle={sector.label} showBack />

        <WalletActivityHeroCard item={item} />

        <Text variant="label" style={styles.sectionTitle}>
          Tüm bilgiler
        </Text>
        <GlassCard padded={false} style={styles.detailCard}>
          <DetailRow label="Sektör" value={sector.label} />
          <DetailRow label="Para birimi" value={item.currency === 'points' ? 'Güven puanı' : 'TRY'} />
          <DetailRow label="Tutar" value={formatActivityAmount(item)} emphasize accent={amountColor} />
          <DetailRow label="Transfer durumu" value={WALLET_ACTIVITY_STATUS_LABELS[item.status]} />
          <DetailRow label="İşlem tarihi" value={formatActivityFullDate(item.occurredAt)} />
          {item.details.map((field) => (
            <DetailRow
              key={`${field.label}-${field.value}`}
              label={field.label}
              value={field.value}
              emphasize={field.emphasize}
              accent={field.emphasize ? sector.accent : undefined}
            />
          ))}
          <DetailRow label="Belge no" value={item.id} isLast />
        </GlassCard>

        <Button
          title="PDF yazdır / paylaş"
          onPress={handlePdf}
          loading={exporting}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </GradientBackground>
  );
}

function DetailRow({
  label,
  value,
  emphasize,
  accent,
  isLast,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  accent?: string;
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text variant="caption" secondary style={styles.detailLabel}>
        {label}
      </Text>
      <Text
        variant={emphasize ? 'label' : 'body'}
        style={[
          styles.detailValue,
          emphasize && accent ? { color: accent, fontWeight: '800' } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  missing: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailCard: {
    overflow: 'hidden',
  },
  detailRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 4,
  },
  detailLabel: {
    fontWeight: '600',
  },
  detailValue: {
    lineHeight: 20,
  },
});
