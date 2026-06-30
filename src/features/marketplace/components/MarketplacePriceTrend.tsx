import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatMarketplacePrice, MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { computePriceTrend } from '@/features/marketplace/services/priceHistory';
import type { MarketplaceListing, MarketplacePricePoint } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listing: MarketplaceListing;
  history: MarketplacePricePoint[];
};

export function MarketplacePriceTrend({ listing, history }: Props) {
  const { colors } = useTheme();
  const trend = useMemo(() => computePriceTrend(history), [history]);

  if (listing.listingType === 'free' || listing.listingType === 'trade') return null;

  const chartPoints = history.filter((p) => p.price != null && p.price > 0);
  if (chartPoints.length < 2) return null;

  const values = chartPoints.map((p) => p.price as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const trendColor =
    trend.direction === 'up' ? colors.danger : trend.direction === 'down' ? colors.success : colors.textMuted;
  const trendIcon =
    trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'remove-outline';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text variant="label">Son 21 gün fiyat</Text>
          <Text secondary variant="caption">
            {trend.minPrice != null && trend.maxPrice != null
              ? `En düşük ${formatMarketplacePrice(trend.minPrice, listing.listingType, listing.currency)} · En yüksek ${formatMarketplacePrice(trend.maxPrice, listing.listingType, listing.currency)}`
              : 'Fiyat hareketi'}
          </Text>
        </View>
        {trend.changePct != null ? (
          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}18` }]}>
            <Ionicons name={trendIcon} size={14} color={trendColor} />
            <Text variant="caption" style={{ color: trendColor, fontWeight: '800' }}>
              {trend.changePct > 0 ? '+' : ''}
              {trend.changePct.toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chart}>
        {chartPoints.map((point, index) => {
          const value = point.price as number;
          const normalized = (value - min) / range;
          const barHeight = Math.max(6, 8 + normalized * 56);
          const isLast = index === chartPoints.length - 1;
          return (
            <View key={point.day} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isLast ? MARKETPLACE_ACCENT : `${MARKETPLACE_ACCENT}55`,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text secondary variant="caption">
          21 gün önce
        </Text>
        <Text secondary variant="caption">
          Bugün
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 72,
    gap: 3,
    marginTop: spacing.xs,
  },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
});
