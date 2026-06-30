import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { BusinessShopPayCta } from '@/features/business-center/components/BusinessShopPayCta';
import {
  BUSINESS_SHOP_CARD_RADIUS,
  businessShopHotelPath,
  resolveBusinessShopHotelCta,
  shopAccentColor,
} from '@/features/business-center/constants';
import type { BusinessShopHotel } from '@/features/business-center/types';
import { HOTEL_GRADIENT, formatHotelPrice } from '@/features/hotel-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  hotel: BusinessShopHotel;
  accent?: string | null;
  compact?: boolean;
};

export const BusinessShopHotelCard = memo(function BusinessShopHotelCard({
  hotel,
  accent,
  compact = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const tone = shopAccentColor(accent);
  const cta = useMemo(() => resolveBusinessShopHotelCta(hotel.id), [hotel.id]);

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
        colors={[`${HOTEL_GRADIENT[0]}CC`, `${HOTEL_GRADIENT[1]}88`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGlow}
        pointerEvents="none"
      />

      <Pressable
        onPress={() => router.push(businessShopHotelPath(hotel.id) as never)}
        style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
      >
        <View style={[styles.imageShell, compact && styles.imageShellCompact]}>
          {hotel.coverUrl ? (
            <OptimizedImage
              uri={hotel.coverUrl}
              style={styles.image}
              tier="grid"
              contentFit="cover"
              recyclingKey={hotel.id}
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: `${tone}18` }]}>
              <Ionicons name="bed-outline" size={32} color={tone} />
            </View>
          )}

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.imageFade} pointerEvents="none" />

          <View style={[styles.modePill, { borderColor: 'rgba(255,255,255,0.35)' }]}>
            <Ionicons name="bed" size={10} color="#fff" />
            <Text variant="caption" style={styles.modeText}>
              Otel
            </Text>
          </View>

          {hotel.district?.trim() ? (
            <View style={[styles.locationPill, { borderColor: 'rgba(255,255,255,0.35)' }]}>
              <Ionicons name="location-outline" size={10} color="#fff" />
              <Text variant="caption" style={styles.locationText} numberOfLines={1}>
                {hotel.district.trim()}
              </Text>
            </View>
          ) : null}

          <View style={styles.previewMeta}>
            <Text variant="caption" style={styles.previewTitle} numberOfLines={2}>
              {hotel.name}
            </Text>
            <Text variant="label" style={styles.previewPrice}>
              {formatHotelPrice(hotel.pricePerNight)} / gece
            </Text>
            {hotel.studentDiscountPct > 0 ? (
              <Text variant="caption" style={styles.discount}>
                Öğrenci %{hotel.studentDiscountPct} indirim
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      <View style={styles.ctaWrap}>
        <BusinessShopPayCta
          label={cta.label}
          icon={cta.icon}
          accent={HOTEL_GRADIENT[0]}
          securePayment={cta.securePayment}
          compact={compact}
          onPress={() => router.push(cta.path as never)}
        />
      </View>

      {!compact ? (
        <View style={[styles.footer, { borderTopColor: `${colors.border}55` }]}>
          <Text secondary variant="caption" numberOfLines={1}>
            {hotel.district}
          </Text>
          {hotel.reviewCount > 0 ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={11} color="#FFB300" />
              <Text variant="caption" style={{ fontWeight: '700' }}>
                {hotel.ratingAvg.toFixed(1)}
              </Text>
            </View>
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
  imageShell: { position: 'relative', aspectRatio: 0.82, overflow: 'hidden' },
  imageShellCompact: { aspectRatio: 0.9 },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageFade: { ...StyleSheet.absoluteFillObject },
  modePill: {
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
  modeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
  discount: { color: '#C8E6C9', fontWeight: '600', fontSize: 11 },
  ctaWrap: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
