import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_SHOP_CARD_RADIUS,
  COMMERCE_MODE_LABELS,
  SHOP_BOOST_ACCENT,
  businessSectorLabel,
  shopAccentColor,
} from '@/features/business-center/constants';
import type { BusinessShopBrowseItem } from '@/features/business-center/types';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  item: BusinessShopBrowseItem;
};

export const BusinessShopBrowseCard = memo(function BusinessShopBrowseCard({ item }: Props) {
  const { colors, isDark } = useTheme();
  const tone = shopAccentColor(item.shopAccent);
  const cover = item.coverUrl ?? item.logoUrl;
  const itemCount = item.productCount + item.hotelCount;

  return (
    <Pressable
      onPress={() => router.push(`/business-center/shop/${item.id}` as never)}
      style={({ pressed }) => [
        styles.wrap,
        {
          opacity: pressed ? 0.9 : 1,
          borderColor: `${tone}55`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.62)',
        },
      ]}
    >
      <View style={styles.hero}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[`${tone}88`, `${tone}33`]} style={styles.cover} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.fade} />

        {item.isFeatured ? (
          <View style={[styles.featuredBadge, { backgroundColor: SHOP_BOOST_ACCENT }]}>
            <Ionicons name="sparkles" size={10} color="#fff" />
            <Text variant="caption" style={styles.featuredBadgeText}>
              Öne çıkan
            </Text>
          </View>
        ) : null}

        <View style={styles.logoWrap}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: `${tone}44` }]}>
              <Ionicons name="storefront" size={18} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text variant="label" style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isVerified ? <BusinessVerifiedTick size={14} /> : null}
          </View>
          <Text variant="caption" style={styles.tagline} numberOfLines={2}>
            {item.shopTagline ?? COMMERCE_MODE_LABELS[item.commerceMode]}
          </Text>
          <View style={styles.stats}>
            <Text variant="caption" style={styles.statText}>
              {businessSectorLabel(item.category)}
              {itemCount > 0 ? ` · ${itemCount} vitrin` : ''}
              {item.district ? ` · ${item.district}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BUSINESS_SHOP_CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  hero: { height: 200, position: 'relative' },
  cover: { ...StyleSheet.absoluteFillObject },
  fade: { ...StyleSheet.absoluteFillObject },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    zIndex: 2,
  },
  featuredBadgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  logoWrap: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
  },
  logo: { width: 44, height: 44 },
  logoPlaceholder: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 4,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { color: '#fff', fontWeight: '900', flexShrink: 1 },
  tagline: { color: 'rgba(255,255,255,0.88)' },
  stats: { marginTop: 2 },
  statText: { color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
});
