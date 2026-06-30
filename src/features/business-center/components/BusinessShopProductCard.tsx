import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { BusinessShopPayCta } from '@/features/business-center/components/BusinessShopPayCta';
import {
  BUSINESS_GRADIENT,
  BUSINESS_SHOP_CARD_RADIUS,
  businessShopProductPath,
  resolveBusinessShopProductCta,
  shopAccentColor,
} from '@/features/business-center/constants';
import type { BusinessShopProduct } from '@/features/business-center/types';
import { formatMarketplacePrice } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  product: BusinessShopProduct;
  accent?: string | null;
  onPress?: () => void;
  compact?: boolean;
};

export const BusinessShopProductCard = memo(function BusinessShopProductCard({
  product,
  accent,
  onPress,
  compact = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const tone = shopAccentColor(accent);
  const imageUri = product.coverUrl ?? product.mediaUrls[0] ?? null;
  const priceLabel = formatMarketplacePrice(product.price, product.listingType, product.currency);
  const cta = useMemo(() => resolveBusinessShopProductCta(product), [product]);

  const openDetail = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push(businessShopProductPath(product.id) as never);
  };

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        {
          borderColor: `${tone}44`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)',
        },
      ]}
    >
      <LinearGradient
        colors={[`${tone}CC`, `${BUSINESS_GRADIENT[1]}88`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGlow}
        pointerEvents="none"
      />

      <Pressable onPress={openDetail} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
        <View style={[styles.imageShell, compact && styles.imageShellCompact]}>
          {imageUri ? (
            <OptimizedImage
              uri={imageUri}
              style={styles.image}
              tier="grid"
              contentFit="cover"
              recyclingKey={product.id}
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: `${tone}18` }]}>
              <Ionicons name="bag-outline" size={32} color={tone} />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={styles.imageFade}
            pointerEvents="none"
          />

          {cta.securePayment ? (
            <View style={[styles.securePill, { borderColor: 'rgba(255,255,255,0.35)' }]}>
              <Ionicons name="shield-checkmark" size={10} color="#A5D6A7" />
              <Text variant="caption" style={styles.secureText}>
                Güvenli ödeme
              </Text>
            </View>
          ) : null}

          {product.district?.trim() ? (
            <View style={[styles.locationPill, { borderColor: 'rgba(255,255,255,0.35)' }]}>
              <Ionicons name="location-outline" size={10} color="#fff" />
              <Text variant="caption" style={styles.locationText} numberOfLines={1}>
                {product.district.trim()}
              </Text>
            </View>
          ) : null}

          <View style={styles.previewMeta}>
            <Text variant="caption" style={styles.previewTitle} numberOfLines={2}>
              {product.title}
            </Text>
            <Text variant="label" style={styles.previewPrice}>
              {priceLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.ctaWrap}>
        <BusinessShopPayCta
          label={cta.label}
          icon={cta.icon}
          accent={tone}
          securePayment={cta.securePayment}
          compact={compact}
          onPress={() => router.push(cta.path as never)}
        />
      </View>

      {!compact ? (
        <View style={[styles.footer, { borderTopColor: `${colors.border}55` }]}>
          <Text secondary variant="caption" numberOfLines={1}>
            {product.district}
          </Text>
          {product.listingType === 'negotiable' ? (
            <Text variant="caption" style={{ color: tone, fontWeight: '700' }}>
              Pazarlık
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: BUSINESS_SHOP_CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  wrapCompact: { marginBottom: 0 },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 1,
  },
  imageShell: {
    position: 'relative',
    aspectRatio: 0.82,
    overflow: 'hidden',
  },
  imageShellCompact: { aspectRatio: 0.9 },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageFade: {
    ...StyleSheet.absoluteFillObject,
  },
  securePill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  secureText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  locationPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '55%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  locationText: { color: '#fff', fontSize: 10, fontWeight: '700', flexShrink: 1 },
  previewMeta: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    gap: 4,
  },
  previewTitle: { color: '#fff', fontWeight: '800', lineHeight: 17 },
  previewPrice: { color: '#fff', fontWeight: '900', fontSize: 16 },
  ctaWrap: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
