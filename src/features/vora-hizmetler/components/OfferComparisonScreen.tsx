import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { ServiceOfferCard } from '@/features/vora-hizmetler/components/ServiceOfferCard';
import { HizmetHeroBanner } from '@/features/vora-hizmetler/components/HizmetUi';
import { HizmetStatTile, HizmetStatsRow } from '@/features/vora-hizmetler/components/HizmetStatCard';
import { formatServicePrice, VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useServiceOffers } from '@/features/vora-hizmetler/hooks/useServiceOffers';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function OfferComparisonScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { colors } = useTheme();
  const { offers, loading } = useServiceOffers(requestId ?? null);

  const sorted = [...offers].sort((a, b) => a.price - b.price);
  const bestPrice = sorted[0]?.price;
  const bestRating = [...offers].sort((a, b) => b.providerRating - a.providerRating)[0];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        <HizmetHeroBanner
          title="Teklif Karşılaştırma"
          subtitle="Fiyat, puan ve uzaklığı yan yana inceleyin"
          icon="analytics-outline"
          compact
        />

        {loading ? (
          <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
        ) : (
          <>
            {offers.length > 0 ? (
              <HizmetStatsRow>
                <HizmetStatTile
                  index={0}
                  compact
                  label="En Uygun Fiyat"
                  value={bestPrice ? formatServicePrice(bestPrice) : '—'}
                  icon="cash-outline"
                  color="#10B981"
                />
                <HizmetStatTile
                  index={1}
                  compact
                  label="En Yüksek Puan"
                  value={bestRating ? bestRating.providerRating.toFixed(1) : '—'}
                  icon="star-outline"
                  color="#F59E0B"
                />
                <HizmetStatTile
                  index={2}
                  compact
                  label="Toplam Teklif"
                  value={String(offers.length)}
                  icon="layers-outline"
                  color={VORA_HIZMETLER_ACCENT}
                />
              </HizmetStatsRow>
            ) : null}

            {sorted.length > 0 ? (
              <GlassCard style={styles.tableCard} padded={false}>
                <LinearGradient colors={[`${VORA_HIZMETLER_ACCENT}12`, 'transparent']} style={styles.tableHeaderBg} />
                <View style={styles.tableHeader}>
                  <HeaderCell text="Usta" flex={2} />
                  <HeaderCell text="Puan" />
                  <HeaderCell text="Fiyat" />
                  <HeaderCell text="Uzaklık" />
                </View>

                {sorted.map((offer, index) => (
                  <View
                    key={offer.id}
                    style={[
                      styles.compareRow,
                      { borderTopColor: colors.border },
                      index === 0 && styles.compareRowBest,
                    ]}
                  >
                    {index === 0 ? (
                      <View style={styles.bestBadge}>
                        <Ionicons name="trophy" size={10} color="#fff" />
                        <Text variant="caption" style={styles.bestBadgeText}>
                          En uygun
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ flex: 2 }}>
                      <Text variant="label" numberOfLines={1}>
                        {offer.providerName}
                      </Text>
                      <Text secondary variant="caption">
                        {offer.providerJobCount} iş · %{Math.round(offer.providerCompletionRate)}
                      </Text>
                    </View>
                    <Text variant="caption" style={styles.cellCenter}>
                      {offer.providerRating.toFixed(1)}
                    </Text>
                    <Text
                      variant="caption"
                      style={[
                        styles.cellCenter,
                        { fontWeight: '800', color: offer.price === bestPrice ? VORA_HIZMETLER_ACCENT : colors.text },
                      ]}
                    >
                      {formatServicePrice(offer.price)}
                    </Text>
                    <Text secondary variant="caption" style={styles.cellCenter}>
                      {offer.distanceKm != null ? `${offer.distanceKm.toFixed(1)} km` : '—'}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            ) : null}

            {sorted.map((offer) => (
              <ServiceOfferCard key={`card-${offer.id}`} offer={offer} />
            ))}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function HeaderCell({ text, flex }: { text: string; flex?: number }) {
  const { colors } = useTheme();
  return (
    <Text secondary variant="caption" style={{ flex: flex ?? 1, fontWeight: '800', color: colors.textSecondary, fontSize: 11 }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  loader: {
    marginTop: spacing.xl,
  },
  tableCard: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  tableHeaderBg: {
    ...StyleSheet.absoluteFillObject,
    height: 48,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  compareRowBest: {
    backgroundColor: `${VORA_HIZMETLER_ACCENT}08`,
  },
  bestBadge: {
    position: 'absolute',
    top: 4,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: VORA_HIZMETLER_ACCENT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  bestBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 9,
  },
  cellCenter: {
    width: 52,
    textAlign: 'center',
    fontWeight: '600',
  },
});
