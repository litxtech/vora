import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { BusinessShopHotelCard } from '@/features/business-center/components/BusinessShopHotelCard';
import { BusinessShopProductCard } from '@/features/business-center/components/BusinessShopProductCard';
import { BusinessShopSectionHeader } from '@/features/business-center/components/BusinessShopSectionHeader';
import {
  BUSINESS_ROUTES,
  commerceModeShowsHotels,
  commerceModeShowsProducts,
  shopAccentColor,
} from '@/features/business-center/constants';
import { fetchBusinessShopSnapshot } from '@/features/business-center/services/businessShopData';
import type { BusinessShopSnapshot } from '@/features/business-center/types';
import { spacing } from '@/constants/theme';

type Props = {
  businessId: string;
};

type ShowcaseItem =
  | { kind: 'product'; id: string; product: BusinessShopSnapshot['products'][number] }
  | { kind: 'hotel'; id: string; hotel: BusinessShopSnapshot['hotels'][number] };

export function BusinessShopPreviewSection({ businessId }: Props) {
  const [snapshot, setSnapshot] = useState<BusinessShopSnapshot | null>(null);

  useEffect(() => {
    fetchBusinessShopSnapshot(businessId).then(setSnapshot);
  }, [businessId]);

  const showcaseItems = useMemo((): ShowcaseItem[] => {
    if (!snapshot) return [];
    const items: ShowcaseItem[] = [];
    if (commerceModeShowsProducts(snapshot.business.commerceMode)) {
      for (const product of snapshot.products) {
        items.push({ kind: 'product', id: product.id, product });
      }
    }
    if (commerceModeShowsHotels(snapshot.business.commerceMode)) {
      for (const hotel of snapshot.hotels) {
        items.push({ kind: 'hotel', id: hotel.id, hotel });
      }
    }
    return items;
  }, [snapshot]);

  if (!snapshot) return null;
  const { business } = snapshot;
  if (!business.shopPublished && business.commerceMode === 'none') return null;
  if (showcaseItems.length === 0) return null;

  const accent = shopAccentColor(business.shopAccent);

  const rows: ShowcaseItem[][] = [];
  for (let i = 0; i < showcaseItems.length; i += 2) {
    rows.push(showcaseItems.slice(i, i + 2));
  }

  return (
    <GlassCard style={styles.card}>
      <BusinessShopSectionHeader itemCount={showcaseItems.length} accent={accent} />

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((item) => (
              <View key={item.id} style={styles.cell}>
                {item.kind === 'product' ? (
                  <BusinessShopProductCard product={item.product} accent={accent} compact />
                ) : (
                  <BusinessShopHotelCard hotel={item.hotel} accent={accent} compact />
                )}
              </View>
            ))}
            {row.length === 1 ? <View style={styles.cell} /> : null}
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push(BUSINESS_ROUTES.shop(businessId) as never)}
        style={styles.moreLink}
      >
        <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
          Mağaza vitrinini aç
        </Text>
        <Ionicons name="arrow-forward" size={14} color={accent} />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginHorizontal: spacing.lg },
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  moreLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
});
