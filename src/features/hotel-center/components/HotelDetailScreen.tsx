import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { HOTEL_FEATURE } from '@/features/hotel-center/featureFlags';
import { HotelReviewAction } from '@/features/hotel-center/components/HotelReviewAction';
import { HotelReviewList } from '@/features/hotel-center/components/HotelReviewList';
import { HotelReviewSheet } from '@/features/hotel-center/components/HotelReviewSheet';
import { HotelReservationSheet } from '@/features/hotel-center/components/HotelReservationSheet';
import { HotelRoomTypesList } from '@/features/hotel-center/components/HotelRoomTypesList';
import { HotelHostRow } from '@/features/hotel-center/components/HotelHostRow';
import { HotelPriceDisplay } from '@/features/hotel-center/components/HotelPriceDisplay';
import { HotelStarRating } from '@/features/hotel-center/components/HotelStarRating';
import { HotelVideoStrip } from '@/features/hotel-center/components/HotelVideoStrip';
import {
  HOTEL_ACCENT,
  amenityLabel,
  formatHotelPrice,
  formatHotelRoomAvailability,
  hotelEditPath,
  hotelReservationsPath,
} from '@/features/hotel-center/constants';
import { useHotelReviewsRealtime } from '@/features/hotel-center/hooks/useHotelReviewsRealtime';
import {
  fetchHotelDetail,
  incrementHotelView,
} from '@/features/hotel-center/services/hotelData';
import { fetchHotelReviews, submitHotelReview } from '@/features/hotel-center/services/hotelReviews';
import {
  fetchHotelReviewEligibility,
  reviewEligibilityMessage,
  type HotelReviewEligibility,
} from '@/features/hotel-center/services/hotelReviewEligibility';
import type { HotelGuestType, HotelListingDetail, HotelReview } from '@/features/hotel-center/types';
import { HotelMarketingBanner } from '@/features/hotel-marketing/components/HotelMarketingBanner';
import { fetchActiveHotelMarketingCampaigns } from '@/features/hotel-marketing/services/hotelMarketingCampaigns';
import type { HotelMarketingCampaign } from '@/features/hotel-marketing/types';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function HotelDetailScreen() {
  const { id: rawId, reserve } = useLocalSearchParams<{ id: string | string[]; reserve?: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const showDetailReserve = useFeatureVisible(HOTEL_FEATURE.detailReserve);
  const showDetailEdit = useFeatureVisible(HOTEL_FEATURE.detailEdit);
  const showDetailCall = useFeatureVisible(HOTEL_FEATURE.detailCall);
  const showDetailWhatsapp = useFeatureVisible(HOTEL_FEATURE.detailWhatsapp);
  const showDetailShare = useFeatureVisible(HOTEL_FEATURE.detailShare);

  const [hotel, setHotel] = useState<HotelListingDetail | null>(null);
  const [reviews, setReviews] = useState<HotelReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reservationSheetOpen, setReservationSheetOpen] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState<HotelReviewEligibility | null>(null);
  const [marketingCampaign, setMarketingCampaign] = useState<HotelMarketingCampaign | null>(null);
  const viewCountedRef = useRef<string | null>(null);
  const reservePromptShown = useRef(false);

  const loadReviewEligibility = useCallback(async () => {
    if (!id || !user?.id) {
      setReviewEligibility(null);
      return;
    }
    setReviewEligibility(await fetchHotelReviewEligibility(id));
  }, [id, user?.id]);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    setReviews(await fetchHotelReviews(id));
    setReviewsLoading(false);
  }, [id]);

  const refreshRatings = useCallback(async () => {
    if (!id) return;
    const detail = await fetchHotelDetail(id, user?.id ?? null);
    if (!detail) return;
    setHotel((prev) =>
      prev
        ? {
            ...prev,
            avgRating: detail.avgRating,
            reviewCount: detail.reviewCount,
            myReview: detail.myReview,
          }
        : detail,
    );
    void loadReviews();
    void loadReviewEligibility();
  }, [id, user?.id, loadReviews, loadReviewEligibility]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const detail = await fetchHotelDetail(id, user?.id ?? null);
    if (!detail) {
      setError('Otel bulunamadı.');
      setHotel(null);
    } else {
      setHotel(detail);
      setError(null);
    }
    setLoading(false);
    void loadReviews();
    void loadReviewEligibility();
    if (id) {
      const campaigns = await fetchActiveHotelMarketingCampaigns(profile?.region_id ?? null);
      setMarketingCampaign(campaigns.find((c) => c.hotelId === id) ?? null);
    } else {
      setMarketingCampaign(null);
    }
  }, [id, user?.id, loadReviews, loadReviewEligibility, profile?.region_id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id || viewCountedRef.current === id) return;
    viewCountedRef.current = id;
    void incrementHotelView(id);
  }, [id]);

  useHotelReviewsRealtime(id ?? null, refreshRatings);

  const isOwner = user?.id === hotel?.ownerId;
  const photos = hotel?.mediaUrls ?? [];
  const coverPhoto = photos[0] ?? hotel?.coverUrl ?? null;
  const hasDiscount = (hotel?.studentDiscountPct ?? 0) > 0;
  const roomTypes = hotel?.roomTypes ?? [];
  const availableRooms = hotel
    ? roomTypes.length > 0
      ? roomTypes.reduce((sum, room) => sum + Math.max(0, room.totalCount - room.occupiedCount), 0)
      : Math.max(0, hotel.totalRooms - hotel.occupiedRooms)
    : 0;
  const canReserve = !isOwner && availableRooms > 0;

  const openReservation = useCallback(async () => {
    if (!(await requireAuth('Rezervasyon'))) return;
    setReservationSheetOpen(true);
  }, [requireAuth]);

  useEffect(() => {
    if (reservePromptShown.current || loading || !hotel) return;
    if (reserve !== '1' || isOwner || !canReserve) return;
    reservePromptShown.current = true;
    if (!user) {
      void requireAuth('Rezervasyon');
      return;
    }
    setReservationSheetOpen(true);
  }, [reserve, loading, hotel, isOwner, canReserve, user, requireAuth]);

  const openPhotoViewer = (index: number) => {
    if (!photos.length) return;
    setPhotoViewerIndex(index);
    setPhotoViewerOpen(true);
  };

  const handleShare = async () => {
    if (!hotel) return;
    await Share.share({
      message: `${hotel.name}\nVora özel fiyat: ${formatHotelPrice(hotel.pricePerNight)}/gece\n\nVora uygulamasında oteli görüntüle.`,
      title: hotel.name,
    });
  };

  const handleCall = () => {
    if (hotel?.phone) void openUrl(`tel:${hotel.phone}`);
  };

  const handleWhatsapp = () => {
    if (hotel?.whatsapp) {
      const num = hotel.whatsapp.replace(/\D/g, '');
      void openUrl(`https://wa.me/${num}`);
    }
  };

  const handleReviewPress = async () => {
    if (!(await requireAuth('Değerlendirme'))) return;
    const canEdit = reviewEligibility?.hasReview || Boolean(hotel?.myReview);
    if (!canEdit && !reviewEligibility?.eligible) {
      Alert.alert('Değerlendirme', reviewEligibility ? reviewEligibilityMessage(reviewEligibility) : 'Bu oteli değerlendiremezsiniz.');
      return;
    }
    setReviewSheetOpen(true);
  };

  const handleReviewSubmit = async (rating: number, guestType: HotelGuestType, comment: string) => {
    if (!(await requireAuth('Değerlendirme')) || !user?.id || !id) return;
    const result = await submitHotelReview(id, user.id, rating, guestType, comment);
    if (result.error) Alert.alert('Hata', result.error);
    else {
      void load();
      void loadReviewEligibility();
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={HOTEL_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !hotel) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.lg }]}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard>
            <Text secondary>{error ?? 'Otel mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={styles.heroWrap}>
          {coverPhoto ? (
            <Pressable onPress={() => openPhotoViewer(0)} style={styles.heroImageWrap} accessibilityLabel="Fotoğrafı büyüt">
              <Image source={{ uri: coverPhoto }} style={[styles.heroImage, { height: 280 + insets.top }]} />
              <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.08)']} locations={[0, 0.35, 1]} style={styles.heroImageFade} pointerEvents="none" />
              <View style={[styles.heroTopBar, { top: insets.top + spacing.xs }]}>
                <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <View style={styles.heroTopActions}>
                  {showDetailShare ? (
                  <Pressable onPress={() => void handleShare()} style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                    <Ionicons name="share-outline" size={20} color="#fff" />
                  </Pressable>
                  ) : null}
                  {isOwner && showDetailEdit ? (
                    <Pressable onPress={() => router.push(hotelEditPath(hotel.id) as never)} style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                      <Ionicons name="create-outline" size={20} color="#fff" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {photos.length > 1 ? (
                <View style={[styles.photoCountPill, { bottom: spacing.md }]}>
                  <Ionicons name="images-outline" size={12} color="#fff" />
                  <Text variant="caption" style={styles.photoCountText}>{photos.length} fotoğraf</Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <View style={[styles.heroTopBar, { top: insets.top + spacing.xs, paddingHorizontal: spacing.md }]}>
              <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            </View>
          )}

          <View style={[styles.heroContentBelow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="h2">{hotel.name}</Text>
            <Text secondary variant="caption">
              {[regionNameById(hotel.regionId), hotel.district].filter(Boolean).join(' · ')}
            </Text>

            <View style={styles.ratingRow}>
              <HotelStarRating rating={hotel.avgRating} size={18} />
              <Text variant="label" style={{ color: HOTEL_ACCENT }}>
                {hotel.reviewCount > 0 ? `${hotel.avgRating.toFixed(1)} · ${hotel.reviewCount} değerlendirme` : 'Henüz puan yok'}
              </Text>
            </View>

            <View style={[styles.priceBox, { backgroundColor: `${HOTEL_ACCENT}10`, borderColor: `${HOTEL_ACCENT}33` }]}>
              <HotelPriceDisplay
                pricePerNight={hotel.pricePerNight}
                listPricePerNight={hotel.listPricePerNight}
                studentDiscountPct={hotel.studentDiscountPct}
                size="lg"
              />
              {hasDiscount ? (
                <View style={styles.discountRow}>
                  <Ionicons name="school" size={14} color={HOTEL_ACCENT} />
                  <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
                    Öğrenci indirimi %{hotel.studentDiscountPct}
                    {hotel.studentDiscountNote ? ` · ${hotel.studentDiscountNote}` : ''}
                  </Text>
                </View>
              ) : null}
              <View style={styles.roomAvailabilityRow}>
                <Ionicons name="bed-outline" size={14} color={availableRooms > 0 ? HOTEL_ACCENT : colors.danger} />
                <Text variant="caption" style={{ color: availableRooms > 0 ? HOTEL_ACCENT : colors.danger, fontWeight: '600' }}>
                  {roomTypes.length > 1
                    ? `${roomTypes.length} oda tipi · ${availableRooms} müsait oda`
                    : formatHotelRoomAvailability(hotel.totalRooms, hotel.occupiedRooms)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {marketingCampaign ? <HotelMarketingBanner campaign={marketingCampaign} /> : null}

          <HotelHostRow hotel={hotel} />

          {roomTypes.length > 0 ? (
            <HotelRoomTypesList roomTypes={roomTypes} studentDiscountPct={hotel.studentDiscountPct} />
          ) : null}

          {photos.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
              {photos.map((uri, index) => (
                <Pressable key={`${uri}-${index}`} onPress={() => openPhotoViewer(index)}>
                  <Image source={{ uri }} style={[styles.thumb, index === 0 && { borderColor: HOTEL_ACCENT, borderWidth: 2 }]} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <GlassCard>
            <Text variant="label">Açıklama</Text>
            <Text variant="body" style={{ marginTop: spacing.xs }}>{hotel.description}</Text>
          </GlassCard>

          {hotel.videoUrls.length > 0 ? (
            <GlassCard>
              <HotelVideoStrip urls={hotel.videoUrls} />
            </GlassCard>
          ) : null}

          {hotel.amenities.length > 0 ? (
            <GlassCard>
              <Text variant="label">Olanaklar</Text>
              <View style={styles.amenities}>
                {hotel.amenities.map((a) => (
                  <View key={a} style={[styles.amenityChip, { backgroundColor: `${HOTEL_ACCENT}14` }]}>
                    <Text variant="caption" style={{ color: HOTEL_ACCENT }}>{amenityLabel(a)}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}

          <View style={styles.reviewSection}>
            <View style={styles.reviewTitleRow}>
              <Text variant="label">Değerlendirmeler</Text>
              {hotel.reviewCount > 0 ? (
                <Text secondary variant="caption">
                  {hotel.avgRating.toFixed(1)} · {hotel.reviewCount}
                </Text>
              ) : null}
            </View>
            {!isOwner && user && reviewEligibility ? (
              <HotelReviewAction eligibility={reviewEligibility} onPress={handleReviewPress} />
            ) : null}
          </View>
          <HotelReviewList reviews={reviews} loading={reviewsLoading} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm, backgroundColor: colors.surface, borderColor: colors.border }]}>
        {!isOwner && canReserve ? (
          <View style={[styles.trustStrip, { backgroundColor: `${HOTEL_ACCENT}14` }]}>
            <Ionicons name="shield-checkmark" size={14} color={HOTEL_ACCENT} />
            <Text variant="caption" style={{ color: HOTEL_ACCENT, flex: 1, fontWeight: '600' }}>
              Vora güvenli ödeme — online veya otelde ödeme seçeneği
            </Text>
          </View>
        ) : null}
        <View style={styles.bottomActions}>
          {!isOwner ? (
            canReserve && showDetailReserve ? (
              <Button title="Rezervasyon Yap" onPress={openReservation} style={styles.reserveBtn} />
            ) : (
              <View style={[styles.soldOutBox, { borderColor: colors.border, flex: 1 }]}>
                <Ionicons name="bed-outline" size={18} color={colors.danger} />
                <Text variant="caption" style={{ color: colors.danger, fontWeight: '600' }}>
                  Müsait oda yok
                </Text>
              </View>
            )
          ) : showDetailEdit ? (
            <Button
              title="Oteli Düzenle"
              variant="outline"
              onPress={() => router.push(hotelEditPath(hotel.id) as never)}
              style={styles.reserveBtn}
            />
          ) : null}
          {hotel.phone && showDetailCall ? (
            <Pressable onPress={handleCall} style={[styles.bottomBtn, { borderColor: colors.border, flex: isOwner ? 1 : 0 }]}>
              <Ionicons name="call-outline" size={20} color={HOTEL_ACCENT} />
              <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>Ara</Text>
            </Pressable>
          ) : null}
          {hotel.whatsapp && showDetailWhatsapp ? (
            <Pressable onPress={handleWhatsapp} style={[styles.bottomBtn, { borderColor: colors.border, flex: isOwner ? 1 : 0 }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text variant="caption" style={{ color: '#25D366', fontWeight: '600' }}>WhatsApp</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FullScreenMediaViewer urls={photos} visible={photoViewerOpen} startIndex={photoViewerIndex} onClose={() => setPhotoViewerOpen(false)} />

      <HotelReviewSheet
        visible={reviewSheetOpen}
        initialRating={hotel.myReview?.rating ?? 0}
        initialGuestType={hotel.myReview?.guestType ?? 'student'}
        initialComment={hotel.myReview?.comment ?? ''}
        onClose={() => setReviewSheetOpen(false)}
        onSubmit={handleReviewSubmit}
      />

      <HotelReservationSheet
        visible={reservationSheetOpen}
        hotel={hotel}
        onClose={() => setReservationSheetOpen(false)}
        onSuccess={(_id, code) => {
          Alert.alert(
            'Rezervasyon alındı',
            `Rezervasyon kodunuz: ${code}\n\nOtel sizinle iletişime geçebilir. Detayları rezervasyonlarınızdan takip edebilirsiniz.`,
            [
              { text: 'Tamam' },
              { text: 'Rezervasyonlarım', onPress: () => router.push(hotelReservationsPath('guest') as never) },
            ],
          );
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { padding: spacing.lg, gap: spacing.md },
  heroWrap: { position: 'relative' },
  heroImageWrap: { position: 'relative', overflow: 'hidden' },
  heroImage: { width: '100%' },
  heroImageFade: { ...StyleSheet.absoluteFillObject },
  heroTopBar: { position: 'absolute', left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  heroTopActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  photoCountPill: { position: 'absolute', right: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  photoCountText: { color: '#fff', fontWeight: '600' },
  heroContentBelow: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  priceBox: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.xs, marginTop: spacing.sm },
  roomAvailabilityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  oldPrice: { textDecorationLine: 'line-through', opacity: 0.5 },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.md },
  thumbRow: { gap: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  amenityChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  reviewSection: { gap: spacing.sm },
  reviewTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  reserveBtn: { flex: 1 },
  soldOutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bottomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, minWidth: 88 },
});
