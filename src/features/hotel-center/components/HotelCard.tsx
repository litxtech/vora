import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HotelPriceDisplay } from '@/features/hotel-center/components/HotelPriceDisplay';
import { HotelStarRating } from '@/features/hotel-center/components/HotelStarRating';
import {
  HOTEL_ACCENT,
  HOTEL_GRADIENT,
  amenityLabel,
  hotelDetailPath,
} from '@/features/hotel-center/constants';
import type { HotelListing } from '@/features/hotel-center/types';
import { HotelCampaignBadge } from '@/features/hotel-marketing/components/HotelCampaignBadge';
import type { HotelMarketingCampaign } from '@/features/hotel-marketing/types';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  hotel: HotelListing;
  campaign?: HotelMarketingCampaign | null;
  onToggleFavorite?: () => void;
};

const COVER_HEIGHT = 168;

export function HotelCard({ hotel, campaign, onToggleFavorite }: Props) {
  const { colors } = useTheme();
  const hasDiscount = hotel.studentDiscountPct > 0;
  const cover = hotel.coverUrl ?? hotel.mediaUrls[0] ?? null;
  const location = [regionNameById(hotel.regionId), hotel.district].filter(Boolean).join(' · ');

  const handleCall = () => {
    if (hotel.phone) void openUrl(`tel:${hotel.phone}`);
  };

  return (
    <GlassCard padded={false} style={[styles.card, { borderColor: `${HOTEL_ACCENT}28` }]}>
      <LinearGradient
        colors={[HOTEL_GRADIENT[0], HOTEL_GRADIENT[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentStrip}
      />

      <Pressable
        onPress={() => router.push(hotelDetailPath(hotel.id) as never)}
        style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
      >
        <View style={styles.mediaSection}>
          <View
            style={[
              styles.coverFrame,
              {
                borderColor: colors.border,
                backgroundColor: `${HOTEL_ACCENT}0A`,
              },
            ]}
          >
            {cover ? (
              <Image source={{ uri: cover }} style={styles.cover} />
            ) : (
              <LinearGradient
                colors={[`${HOTEL_ACCENT}33`, `${HOTEL_ACCENT}10`]}
                style={styles.coverPlaceholder}
              >
                <Ionicons name="bed-outline" size={32} color={HOTEL_ACCENT} />
              </LinearGradient>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)']}
              style={styles.coverFade}
              pointerEvents="none"
            />

            <View style={styles.coverTop}>
              {hotel.reviewCount > 0 ? (
                <View style={styles.ratingPill}>
                  <HotelStarRating rating={hotel.avgRating} size={11} />
                  <Text variant="caption" style={styles.ratingText}>
                    {hotel.avgRating.toFixed(1)} · {hotel.reviewCount}
                  </Text>
                </View>
              ) : (
                <View style={styles.ratingPill}>
                  <Text variant="caption" style={styles.ratingText}>
                    Yeni
                  </Text>
                </View>
              )}

              {onToggleFavorite ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onToggleFavorite();
                  }}
                  hitSlop={8}
                  style={styles.favBtn}
                >
                  <Ionicons
                    name={hotel.isFavorited ? 'heart' : 'heart-outline'}
                    size={16}
                    color={hotel.isFavorited ? '#FF6B8A' : '#fff'}
                  />
                </Pressable>
              ) : hasDiscount ? (
                <View style={styles.discountBadge}>
                  <Ionicons name="school" size={10} color="#fff" />
                  <Text variant="caption" style={styles.discountText}>
                    -%{hotel.studentDiscountPct}
                  </Text>
                </View>
              ) : null}
            </View>

            {hasDiscount && onToggleFavorite ? (
              <View style={styles.discountBadgeFloating}>
                <Ionicons name="school" size={10} color="#fff" />
                <Text variant="caption" style={styles.discountText}>
                  -%{hotel.studentDiscountPct}
                </Text>
              </View>
            ) : null}

            {campaign ? (
              <View style={styles.campaignBadgeWrap}>
                <HotelCampaignBadge campaign={campaign} compact />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <Text variant="label" numberOfLines={1} style={styles.title}>
            {hotel.name}
          </Text>
          {campaign ? (
            <Text secondary variant="caption" numberOfLines={1} style={styles.campaignMessage}>
              {campaign.message}
            </Text>
          ) : null}

          {location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text secondary variant="caption" numberOfLines={1} style={styles.locationText}>
                {location}
                {hotel.distanceKm != null
                  ? ` · ${
                      hotel.distanceKm < 1
                        ? `${Math.round(hotel.distanceKm * 1000)} m`
                        : `${hotel.distanceKm.toFixed(1)} km`
                    }`
                  : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <HotelPriceDisplay
              pricePerNight={hotel.pricePerNight}
              listPricePerNight={hotel.listPricePerNight}
              studentDiscountPct={hotel.studentDiscountPct}
              size="sm"
            />

            {hotel.amenities.length > 0 ? (
              <View style={styles.amenities}>
                {hotel.amenities.slice(0, 2).map((a) => (
                  <View key={a} style={[styles.chip, { backgroundColor: `${HOTEL_ACCENT}12` }]}>
                    <Text variant="caption" style={{ color: HOTEL_ACCENT, fontSize: 10 }}>
                      {amenityLabel(a)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>

      {hotel.phone ? (
        <Pressable onPress={handleCall} style={[styles.callBtn, { borderColor: colors.border }]}>
          <Ionicons name="call-outline" size={15} color={HOTEL_ACCENT} />
          <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>
            Ara
          </Text>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', gap: 0 },
  accentStrip: { height: 2, width: '100%' },
  mediaSection: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  coverFrame: {
    position: 'relative',
    height: COVER_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  coverTop: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ratingText: { color: '#fff', fontWeight: '600', fontSize: 10 },
  favBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HOTEL_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  discountBadgeFloating: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HOTEL_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  discountText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  campaignBadgeWrap: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
  },
  campaignMessage: { color: HOTEL_ACCENT, fontWeight: '600' },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  title: { fontWeight: '700' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: { flex: 1 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 2,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
  oldPrice: { textDecorationLine: 'line-through', opacity: 0.5, fontSize: 11 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
