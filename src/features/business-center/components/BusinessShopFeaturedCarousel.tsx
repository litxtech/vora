import { memo, useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_SHOP_CARD_RADIUS,
  SHOP_BOOST_ACCENT,
  businessSectorLabel,
  formatShopBoostPrice,
  shopAccentColor,
} from '@/features/business-center/constants';
import { recordShopBoostImpression, recordShopBoostShopView } from '@/features/business-center/services/shopBoostData';
import type { BusinessShopBoostActive } from '@/features/business-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  items: BusinessShopBoostActive[];
};

export const BusinessShopFeaturedCarousel = memo(function BusinessShopFeaturedCarousel({ items }: Props) {
  const { colors } = useTheme();
  const recorded = useRef(new Set<string>());

  useEffect(() => {
    for (const item of items) {
      if (recorded.current.has(item.boostId)) continue;
      recorded.current.add(item.boostId);
      void recordShopBoostImpression(item.boostId);
    }
  }, [items]);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={16} color={SHOP_BOOST_ACCENT} />
        <Text variant="label" style={{ color: SHOP_BOOST_ACCENT, fontWeight: '800' }}>
          Öne çıkan mağazalar
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((item) => (
          <FeaturedBoostCard key={item.boostId} item={item} muted={colors.textMuted} />
        ))}
      </ScrollView>
    </View>
  );
});

function FeaturedBoostCard({
  item,
  muted,
}: {
  item: BusinessShopBoostActive;
  muted: string;
}) {
  const tone = shopAccentColor(item.shopAccent);
  const cover = item.coverUrl ?? item.logoUrl;

  const openShop = useCallback(() => {
    void recordShopBoostShopView(item.boostId);
    router.push(`/business-center/shop/${item.businessId}` as never);
  }, [item.boostId, item.businessId]);

  return (
    <Pressable
      onPress={openShop}
      style={({ pressed }) => [
        styles.card,
        { borderColor: `${tone}66`, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.hero}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[`${tone}99`, `${tone}44`]} style={styles.cover} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.fade} />
        <View style={[styles.badge, { backgroundColor: SHOP_BOOST_ACCENT }]}>
          <Text variant="caption" style={styles.badgeText}>
            Öne çıkan
          </Text>
        </View>
        <View style={styles.meta}>
          <Text variant="label" style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="caption" style={styles.tagline} numberOfLines={1}>
            {item.shopTagline ?? businessSectorLabel(item.category)}
          </Text>
        </View>
      </View>

      {item.showcaseItems.length > 0 ? (
        <View style={styles.products}>
          {item.showcaseItems.slice(0, 3).map((product) => (
            <View key={product.id} style={styles.productChip}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.productThumb} />
              ) : (
                <View style={[styles.productThumb, { backgroundColor: `${tone}33` }]}>
                  <Ionicons name={product.kind === 'hotel' ? 'bed-outline' : 'pricetag-outline'} size={12} color={tone} />
                </View>
              )}
              <View style={styles.productText}>
                <Text variant="caption" numberOfLines={1} style={{ fontWeight: '700', fontSize: 10 }}>
                  {product.title}
                </Text>
                {product.priceCents != null ? (
                  <Text variant="caption" style={{ color: tone, fontWeight: '700', fontSize: 10 }}>
                    {formatShopBoostPrice(product.priceCents)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text secondary variant="caption" style={{ padding: spacing.sm, color: muted }}>
          Mağazayı ziyaret et →
        </Text>
      )}
    </Pressable>
  );
}

const CARD_WIDTH = 280;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scroll: { gap: spacing.md, paddingRight: spacing.lg },
  card: {
    width: CARD_WIDTH,
    borderRadius: BUSINESS_SHOP_CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  hero: { height: 120, position: 'relative' },
  cover: { ...StyleSheet.absoluteFillObject },
  fade: { ...StyleSheet.absoluteFillObject },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  meta: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm },
  name: { color: '#fff', fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  products: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  productChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  productThumb: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productText: { flex: 1, minWidth: 0 },
});
