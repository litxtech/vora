import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaCarousel } from '@/features/feed/components/MediaCarousel';
import { Text } from '@/components/ui/Text';
import { HotelPriceDisplay } from '@/features/hotel-center/components/HotelPriceDisplay';
import { HotelStarRating } from '@/features/hotel-center/components/HotelStarRating';
import {
  HOTEL_ACCENT,
  amenityLabel,
} from '@/features/hotel-center/constants';
import { fetchHotelMapPreview } from '@/features/hotel-center/services/hotelMapPreview';
import type { HotelMapPreview } from '@/features/hotel-center/services/hotelMapPreview';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  hotelId: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onMediaPress?: (index: number) => void;
};

export function HotelMapSheetContent({
  hotelId,
  fallbackTitle,
  fallbackDescription,
  onMediaPress,
}: Props) {
  const { colors } = useTheme();
  const [preview, setPreview] = useState<HotelMapPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchHotelMapPreview(hotelId).then((data) => {
      if (cancelled) return;
      setPreview(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={HOTEL_ACCENT} />
      </View>
    );
  }

  const hotel = preview?.hotel;
  const photos = hotel?.mediaUrls?.length ? hotel.mediaUrls : hotel?.coverUrl ? [hotel.coverUrl] : [];

  if (!hotel) {
    return (
      <Text secondary variant="body">
        {fallbackDescription ?? fallbackTitle ?? 'Otel bilgisi yüklenemedi.'}
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {photos.length > 0 ? (
        <MediaCarousel
          urls={photos}
          variant="inline"
          maxHeight={160}
          onMediaPress={onMediaPress}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: `${HOTEL_ACCENT}18` }]}>
          <Ionicons name="bed-outline" size={32} color={HOTEL_ACCENT} />
        </View>
      )}

      <View style={styles.ratingRow}>
        <HotelStarRating rating={hotel.avgRating} size={16} />
        <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
          {hotel.reviewCount > 0 ? `${hotel.avgRating.toFixed(1)} · ${hotel.reviewCount} yorum` : 'Henüz puan yok'}
        </Text>
      </View>

      <View style={[styles.priceBox, { backgroundColor: `${HOTEL_ACCENT}10`, borderColor: `${HOTEL_ACCENT}33` }]}>
        <HotelPriceDisplay
          pricePerNight={hotel.pricePerNight}
          listPricePerNight={hotel.listPricePerNight}
          studentDiscountPct={hotel.studentDiscountPct}
          size="sm"
        />
        {hotel.studentDiscountNote ? (
          <Text secondary variant="caption">{hotel.studentDiscountNote}</Text>
        ) : null}
      </View>

      <Text secondary variant="caption">
        {[regionNameById(hotel.regionId), hotel.district].filter(Boolean).join(' · ')}
      </Text>

      {hotel.description ? (
        <Text variant="body" secondary numberOfLines={4}>
          {hotel.description}
        </Text>
      ) : null}

      {hotel.amenities.length > 0 ? (
        <View style={styles.amenities}>
          {hotel.amenities.slice(0, 4).map((a) => (
            <View key={a} style={[styles.chip, { backgroundColor: `${HOTEL_ACCENT}14` }]}>
              <Text variant="caption" style={{ color: HOTEL_ACCENT, fontSize: 11 }}>
                {amenityLabel(a)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {(hotel.phone || hotel.whatsapp) ? (
        <View style={styles.contactRow}>
          {hotel.phone ? (
            <View style={[styles.contactChip, { borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={14} color={HOTEL_ACCENT} />
              <Text variant="caption">{hotel.phone}</Text>
            </View>
          ) : null}
          {hotel.whatsapp ? (
            <View style={[styles.contactChip, { borderColor: colors.border }]}>
              <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
              <Text variant="caption">WhatsApp</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  center: { paddingVertical: spacing.lg, alignItems: 'center' },
  placeholder: {
    height: 120,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceBox: { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, gap: 2 },
  oldPrice: { textDecorationLine: 'line-through', opacity: 0.5 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  contactRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
