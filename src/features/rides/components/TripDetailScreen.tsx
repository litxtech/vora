import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { RideReservationPolicyCard } from '@/features/rides/components/RideReservationPolicyCard';
import { RidePassengerDetailsForm } from '@/features/rides/components/RidePassengerDetailsForm';
import { RidePendingRequestCard } from '@/features/rides/components/RidePendingRequestCard';
import { RideTrustBadges as RideTrustBadgesView } from '@/features/rides/components/RideTrustBadges';
import { RideRoutePreview } from '@/features/rides/components/RideRoutePreview';
import { fetchRideTrustBadges } from '@/features/rides/services/trustData';
import type { GenderId } from '@/constants/registration';
import {
  splitRidePassengerName,
  validateRidePassengerDetails,
  type RidePassengerDetails,
} from '@/features/rides/utils/passengerDetails';
import {
  formatContribution,
  formatRideTravelers,
  liveTripPath,
  LUGGAGE_OPTIONS,
  MUSIC_OPTIONS,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  rideCityName,
  registerVehicleAddPath,
  rideRefundRequestPath,
  ridesCreatePath,
  ridesSupportPath,
  RIDES_ACCENT,
  TRIP_STATUS_LABELS,
  TRIP_TYPE_OPTIONS,
} from '@/features/rides/constants';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import { formatRideAutoCompleteLabel } from '@/features/rides/utils/estimateRouteDuration';
import {
  cancelRideTrip,
  completeRideTrip,
  fetchDriverAverageRating,
  fetchRideTrip,
  fetchTripReservations,
  incrementRideTripView,
  publishRideTrip,
  startRideTrip,
} from '@/features/rides/services/tripData';
import {
  cancelPassengerReservation,
  ensureTripConversation,
  fetchMyReservationForTrip,
  requestRideReservationRefund,
  respondReservation,
} from '@/features/rides/services/reservationData';
import { startRideCheckout } from '@/features/rides/services/paymentData';
import { exportTripTicketPdf } from '@/features/rides/services/tripPdfExport';
import { submitRideReview } from '@/features/rides/services/reviewData';
import { hasApprovedLicense } from '@/features/rides/services/licenseData';
import { fetchVehicle, isVehicleApprovedForPublish } from '@/features/rides/services/vehicleData';
import { describeRidePublishBlockers, fetchRidePublishReadiness } from '@/features/rides/services/publishReadiness';
import { filterPendingDriverReservations } from '@/features/rides/utils/pendingReservations';
import type { RideReservation, RideTrip, RideTrustBadges } from '@/features/rides/types';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { RIDES_FEATURE } from '@/features/rides/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function paramString(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function TripDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; checkout?: string | string[] }>();
  const tripId = useMemo(() => paramString(params.id), [params.id]);
  const checkout = useMemo(() => paramString(params.checkout), [params.checkout]);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const showTripReserve = useFeatureVisible(RIDES_FEATURE.tripReserve);
  const showTripPay = useFeatureVisible(RIDES_FEATURE.tripPay);
  const showTripChat = useFeatureVisible(RIDES_FEATURE.tripChat);
  const showTripCancel = useFeatureVisible(RIDES_FEATURE.tripCancel);
  const showTripReview = useFeatureVisible(RIDES_FEATURE.tripReview);
  const showTripPdf = useFeatureVisible(RIDES_FEATURE.tripPdf);
  const showTripEdit = useFeatureVisible(RIDES_FEATURE.tripEdit);
  const showTripPublish = useFeatureVisible(RIDES_FEATURE.tripPublish);
  const showTripStart = useFeatureVisible(RIDES_FEATURE.tripStart);
  const showTripComplete = useFeatureVisible(RIDES_FEATURE.tripComplete);
  const showTripRefund = useFeatureVisible(RIDES_FEATURE.tripRefund);
  const showTripMap = useFeatureVisible(RIDES_FEATURE.tripMap);

  const [trip, setTrip] = useState<RideTrip | null>(null);
  const [reservations, setReservations] = useState<RideReservation[]>([]);
  const [myReservation, setMyReservation] = useState<RideReservation | null>(null);
  const [trust, setTrust] = useState<RideTrustBadges | null>(null);
  const [driverRating, setDriverRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatCount, setSeatCount] = useState('1');
  const [note, setNote] = useState('');
  const [pickupStopId, setPickupStopId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [acting, setActing] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [publishBlockers, setPublishBlockers] = useState<string[]>([]);
  const [passengerDetails, setPassengerDetails] = useState<RidePassengerDetails>({
    firstName: '',
    lastName: '',
    age: 0,
    gender: 'prefer_not_to_say',
  });
  const checkoutHandled = useRef<string | null>(null);

  const isDriver = user?.id === trip?.driverId;

  const loadExtras = useCallback(
    async (t: RideTrip, resolvedTripId: string) => {
      try {
        const [res, mine, rating, badges] = await Promise.all([
          fetchTripReservations(resolvedTripId),
          user ? fetchMyReservationForTrip(resolvedTripId, user.id) : Promise.resolve(null),
          fetchDriverAverageRating(t.driverId),
          fetchRideTrustBadges(t.driverId, { is_verified: t.driverVerified }),
        ]);
        setReservations(res);
        setMyReservation(mine);
        setDriverRating(rating);
        setTrust(badges);
        if (user?.id === t.driverId && t.status === 'draft') {
          const readiness = await fetchRidePublishReadiness(user.id, t.vehicleId);
          setPublishBlockers(describeRidePublishBlockers(readiness));
        } else {
          setPublishBlockers([]);
        }
      } catch {
        setPublishBlockers([]);
      }
    },
    [user?.id],
  );

  const load = useCallback(async () => {
    if (!tripId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const t = await fetchRideTrip(tripId, user?.id);
      setTrip(t);
      if (t) {
        void incrementRideTripView(tripId);
        void loadExtras(t, tripId);
      } else {
        setReservations([]);
        setMyReservation(null);
        setTrust(null);
        setDriverRating(null);
        setPublishBlockers([]);
      }
    } catch {
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id, loadExtras]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const fromProfile = splitRidePassengerName(profile?.full_name);
    setPassengerDetails((current) => ({
      firstName: current.firstName || fromProfile.first,
      lastName: current.lastName || fromProfile.last,
      age: current.age || 0,
      gender: (profile?.gender as GenderId | undefined) ?? current.gender,
    }));
  }, [profile?.full_name, profile?.gender]);

  useEffect(() => {
    if (checkoutHandled.current === checkout || loading || !trip || !checkout) return;
    checkoutHandled.current = checkout;
    if (checkout === 'success') {
      Alert.alert(
        'Kart kaydedildi',
        'Kartınız doğrulandı. Rezervasyon talebiniz şoför onayını bekliyor; katkı payı onay anında tahsil edilir.',
      );
    } else if (checkout === 'cancelled') {
      Alert.alert('İptal edildi', 'Kart doğrulama tamamlanmadı. İstediğiniz zaman tekrar deneyebilirsiniz.');
    }
    load();
  }, [checkout, loading, trip, load]);

  const buildPassengerPayload = useCallback(
    () => ({
      note,
      pickupStopId,
      passengerFirstName: passengerDetails.firstName.trim(),
      passengerLastName: passengerDetails.lastName.trim(),
      passengerAge: passengerDetails.age,
      passengerGender: passengerDetails.gender,
    }),
    [note, passengerDetails, pickupStopId],
  );

  const handleReserve = async () => {
    if (!(await requireAuth('Rezervasyon')) || !trip) return;
    if (!policyAccepted) {
      Alert.alert('Politika onayı gerekli', 'Rezervasyon yapmadan önce politikayı okuyup onaylamalısınız.');
      return;
    }
    const validationError = validateRidePassengerDetails(passengerDetails, trip.womenOnly);
    if (validationError) {
      Alert.alert('Eksik bilgi', validationError);
      return;
    }
    setActing(true);
    const seats = parseInt(seatCount, 10) || 1;
    const { error } = await startRideCheckout({
      tripId: trip.id,
      seatCount: seats,
      passenger: buildPassengerPayload(),
    });
    setActing(false);
    if (error) Alert.alert('Hata', error);
    else load();
  };

  const handleCompletePayment = async () => {
    if (!(await requireAuth('Ödeme')) || !trip || !myReservation) return;
    const details: RidePassengerDetails = {
      firstName: myReservation.passengerFirstName ?? passengerDetails.firstName,
      lastName: myReservation.passengerLastName ?? passengerDetails.lastName,
      age: myReservation.passengerAge ?? passengerDetails.age,
      gender: myReservation.passengerGender ?? passengerDetails.gender,
    };
    const validationError = validateRidePassengerDetails(details, trip.womenOnly);
    if (validationError) {
      Alert.alert('Eksik bilgi', validationError);
      return;
    }
    setActing(true);
    const { error } = await startRideCheckout({
      tripId: trip.id,
      seatCount: myReservation.seatCount,
      reservationId: myReservation.id,
      passenger: {
        note: myReservation.passengerNote ?? note,
        pickupStopId: myReservation.pickupStopId ?? pickupStopId,
        passengerFirstName: details.firstName.trim(),
        passengerLastName: details.lastName.trim(),
        passengerAge: details.age,
        passengerGender: details.gender,
      },
    });
    setActing(false);
    if (error) Alert.alert('Hata', error);
    else load();
  };

  const handleRespond = async (reservationId: string, approve: boolean) => {
    setActing(true);
    const { error, needsRefund } = await respondReservation(reservationId, approve);
    if (error) {
      setActing(false);
      Alert.alert('Hata', error);
      return;
    }
    if (needsRefund) {
      const refund = await requestRideReservationRefund(reservationId);
      setActing(false);
      if (refund.error) {
        Alert.alert('İade', `${refund.error}\n\nİade admin tarafından tamamlanacak.`);
      } else if (refund.message) {
        Alert.alert('Reddedildi', refund.message);
      }
      load();
      return;
    }
    setActing(false);
    if (!approve) {
      Alert.alert('Reddedildi', 'Rezervasyon reddedildi.');
    } else {
      Alert.alert('Onaylandı', 'Rezervasyon onaylandı ve katkı payı yolcunun kartından tahsil edildi.');
      if (trip) await ensureTripConversation(trip.id);
    }
    load();
  };

  const handleStart = async () => {
    if (!trip) return;
    Alert.alert(
      'Erken başlat',
      'Kalkış saatinden önce yolculuğu başlatmak istiyor musunuz? Yolcular bilgilendirilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Başlat',
          onPress: async () => {
            setActing(true);
            const { error } = await startRideTrip(trip.id);
            setActing(false);
            if (error) Alert.alert('Hata', error);
            else load();
          },
        },
      ],
    );
  };

  const handleComplete = async () => {
    if (!trip) return;
    Alert.alert('Yolculuğu tamamla', 'Tüm yolcular varışa ulaştı mı?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Tamamla',
        onPress: async () => {
          setActing(true);
          const { error } = await completeRideTrip(trip.id);
          setActing(false);
          if (error) {
            Alert.alert('Tamamlanamadı', error ?? 'Yolculuk tamamlanamadı. Lütfen tekrar deneyin.');
          } else {
            Alert.alert('Tamamlandı', 'Yolculuk tamamlandı.');
            load();
          }
        },
      },
    ]);
  };

  const handleCancel = async () => {
    if (!trip) return;
    Alert.alert('Yolculuğu iptal et', 'Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          const { error } = await cancelRideTrip(trip.id, 'Sürücü iptal etti');
          if (error) Alert.alert('Hata', error);
          else load();
        },
      },
    ]);
  };

  const handlePublish = async () => {
    if (!trip || !user?.id) return;
    const vehicle = trip.vehicleId ? await fetchVehicle(trip.vehicleId) : null;
    if (!isVehicleApprovedForPublish(vehicle)) {
      Alert.alert('Araç onayı gerekli', 'Yayınlamak için bu yolculuktaki aracın admin tarafından onaylanmış olması gerekir.', [
        { text: 'Tamam' },
        { text: 'Araç kaydet', onPress: () => router.push('/rides-center/vehicle' as never) },
      ]);
      return;
    }
    const licenseOk = await hasApprovedLicense(user.id);
    if (!licenseOk) {
      Alert.alert('Ehliyet onayı gerekli', 'Yayınlamak için doğrulanmış ehliyetiniz olmalı.', [
        { text: 'Tamam' },
        { text: 'Ehliyet yükle', onPress: () => router.push('/rides-center/license' as never) },
      ]);
      return;
    }
    const { error } = await publishRideTrip(trip.id);
    if (error) Alert.alert('Hata', error);
    else load();
  };

  const handleCancelReservation = () => {
    if (!myReservation) return;
    Alert.alert(
      'Rezervasyonu iptal et',
      'Rezervasyonunuz iptal edilecek. Ödeme alındıysa Stripe üzerinden iade süreci başlatılır; onaylı rezervasyonlarda iade garantisi yoktur.',
      [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          const { error, needsRefund } = await cancelPassengerReservation(myReservation.id);
          if (error) {
            setActing(false);
            Alert.alert('Hata', error);
            return;
          }
          if (needsRefund) {
            const refund = await requestRideReservationRefund(myReservation.id);
            setActing(false);
            if (refund.error) {
              Alert.alert('İade', `${refund.error}\n\nİade admin tarafından tamamlanacak.`);
            } else {
              Alert.alert('İptal edildi', refund.message ?? 'Rezervasyon iptal edildi, ödemeniz iade edildi.');
            }
          } else {
            setActing(false);
            Alert.alert('İptal edildi', 'Rezervasyonunuz iptal edildi.');
          }
          load();
        },
      },
    ]);
  };

  const handleReview = async () => {
    if (!myReservation) return;
    const { error } = await submitRideReview(myReservation.id, reviewRating);
    if (error) Alert.alert('Hata', error);
    else Alert.alert('Teşekkürler', 'Puanınız kaydedildi.');
  };

  const handlePdf = async () => {
    if (!trip) return;
    const { error } = await exportTripTicketPdf(trip, myReservation);
    if (error) Alert.alert('PDF', error);
  };

  const openChat = async () => {
    if (!trip) return;
    setActing(true);
    const conversationId = trip.conversationId ?? (await ensureTripConversation(trip.id));
    setActing(false);
    if (conversationId) {
      router.push(`/chat/${conversationId}` as never);
      return;
    }
    Alert.alert('Sohbet', 'Trip sohbeti henüz oluşturulamadı. Onaylı rezervasyon sonrası tekrar deneyin.');
  };

  if (loading || !trip) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, alignItems: 'stretch' }]}>
          <ScreenBackButton style={{ marginBottom: spacing.md }} />
          {loading ? (
            <>
              <ActivityIndicator color={RIDES_ACCENT} />
              <Text secondary style={{ marginTop: spacing.sm }}>
                Yükleniyor…
              </Text>
            </>
          ) : (
            <>
              <Text secondary>Yolculuk bulunamadı</Text>
              <Pressable onPress={() => load()} style={styles.retry}>
                <Text variant="label" style={{ color: RIDES_ACCENT }}>
                  Tekrar dene
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </GradientBackground>
    );
  }

  const routeLabel = `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`;
  const tripTypeLabel = TRIP_TYPE_OPTIONS.find((o) => o.id === trip.tripType)?.label ?? trip.tripType;
  const luggageLabel = LUGGAGE_OPTIONS.find((o) => o.id === trip.luggage)?.label ?? trip.luggage;
  const musicLabel = MUSIC_OPTIONS.find((o) => o.id === trip.musicPreference)?.label ?? trip.musicPreference;
  const canCancelReservation =
    myReservation &&
    (myReservation.status === 'pending' || myReservation.status === 'approved') &&
    !['in_progress', 'completed', 'cancelled'].includes(trip.status);
  const pendingReservations = isDriver ? filterPendingDriverReservations(reservations) : [];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 }]}>
        <ScreenBackButton style={styles.back} />

        {trip.vehiclePhotoUrl ? (
          <Image source={{ uri: trip.vehiclePhotoUrl }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder, { backgroundColor: `${RIDES_ACCENT}18` }]}>
            <Ionicons name="car" size={48} color={RIDES_ACCENT} />
          </View>
        )}

        <Text variant="h2" style={styles.route}>
          {routeLabel}
        </Text>
        <RideRoutePreview
          fromCityId={trip.fromCityId}
          toCityId={trip.toCityId}
          stopCityIds={trip.stops?.map((s) => s.cityId) ?? []}
        />
        {trip.status !== 'cancelled' && showTripMap ? (
          <Button
            title={trip.status === 'in_progress' ? 'Canlı harita' : 'Haritada güzergah'}
            variant="outline"
            onPress={() => router.push(liveTripPath(trip.id) as never)}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
        <Text secondary style={{ marginTop: spacing.xs }}>
          {formatRideDeparture(trip.departureDate, trip.departureTime)} · {TRIP_STATUS_LABELS[trip.status]}
        </Text>

        {isDriver && trip.status === 'draft' ? (
          <GlassCard style={[styles.card, { marginTop: spacing.sm, borderColor: colors.warning }]}>
            <Text variant="label">Keşfet&apos;te görünmüyor</Text>
            <Text secondary variant="caption" style={{ marginTop: spacing.xs }}>
              Bu yolculuk taslak. Diğer kullanıcılar göremez; yayınlandıktan sonra Keşfet listesine düşer.
            </Text>
            {publishBlockers.length ? (
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                {publishBlockers.map((line) => (
                  <Text key={line} variant="caption" style={{ color: colors.warning }}>
                    • {line}
                  </Text>
                ))}
              </View>
            ) : (
              <Text variant="caption" style={{ marginTop: spacing.sm, color: colors.success }}>
                Ehliyet ve araç onaylı — aşağıdaki «Yayınla» ile listeye alabilirsiniz.
              </Text>
            )}
          </GlassCard>
        ) : null}

        {isDriver && trip.status === 'in_progress' ? (
          <GlassCard style={[styles.card, { marginTop: spacing.sm, borderColor: colors.primary }]}>
            <Text variant="label">Yolculuk devam ediyor</Text>
            <Text variant="caption" style={{ marginTop: spacing.xs, color: RIDES_ACCENT, fontWeight: '700' }}>
              {formatRideTravelers(trip)}
            </Text>
            <Text secondary variant="caption" style={{ marginTop: spacing.xs }}>
              {formatRideAutoCompleteLabel(trip)}
            </Text>
            <Text secondary variant="caption" style={{ marginTop: spacing.xs }}>
              İlan Keşfet listesinden kalktı; Yolda sekmesinde ve canlı haritada görünür.
            </Text>
          </GlassCard>
        ) : null}

        {!isDriver && trip.status === 'in_progress' ? (
          <GlassCard style={[styles.card, { marginTop: spacing.sm, borderColor: colors.primary }]}>
            <Text variant="label">Yolculuk devam ediyor</Text>
            <Text variant="caption" style={{ marginTop: spacing.xs, color: RIDES_ACCENT, fontWeight: '700' }}>
              {formatRideTravelers(trip)}
            </Text>
            <Text secondary variant="caption" style={{ marginTop: spacing.xs }}>
              {formatRideAutoCompleteLabel(trip)}
            </Text>
          </GlassCard>
        ) : null}

        {isDriver && (trip.status === 'published' || trip.status === 'full') ? (
          <GlassCard style={[styles.card, { marginTop: spacing.sm }]}>
            <Text secondary variant="caption">
              Kalkış saatinde yolculuk otomatik başlar. Daha erken yola çıkacaksanız «Erken başlat» kullanın.
            </Text>
          </GlassCard>
        ) : null}

        {pendingReservations.length > 0 ? (
          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <Ionicons name="notifications-outline" size={16} color={RIDES_ACCENT} />
              <Text variant="label" style={styles.pendingTitle}>
                Bekleyen talepler ({pendingReservations.length})
              </Text>
            </View>
            {pendingReservations.map((r) => (
              <RidePendingRequestCard
                key={r.id}
                reservation={r}
                acting={acting}
                onApprove={() => void handleRespond(r.id, true)}
                onReject={() => void handleRespond(r.id, false)}
              />
            ))}
          </View>
        ) : null}

        {trip.stops?.length ? (
          <Text secondary variant="caption" style={{ marginTop: spacing.xs }}>
            Ara duraklar: {trip.stops.map((s) => rideCityName(s.cityId)).join(', ')}
          </Text>
        ) : null}

        <GlassCard style={styles.card}>
          <Text variant="label">Yolculuk tercihleri</Text>
          <Text variant="caption">{tripTypeLabel} · {luggageLabel} · {musicLabel}</Text>
          <View style={styles.prefTags}>
            {trip.womenOnly ? (
              <View style={[styles.prefTag, { backgroundColor: `${colors.primary}18` }]}>
                <Text variant="caption">♀ Kadınlara özel</Text>
              </View>
            ) : null}
            {trip.petsAllowed ? (
              <View style={[styles.prefTag, { backgroundColor: `${colors.success}18` }]}>
                <Text variant="caption">🐾 Evcil hayvan</Text>
              </View>
            ) : null}
            {trip.smokingAllowed ? (
              <View style={[styles.prefTag, { backgroundColor: `${colors.border}44` }]}>
                <Text variant="caption">🚬 Sigara içilebilir</Text>
              </View>
            ) : (
              <View style={[styles.prefTag, { backgroundColor: `${colors.border}44` }]}>
                <Text variant="caption">🚭 Sigara yok</Text>
              </View>
            )}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text variant="label" style={{ color: RIDES_ACCENT, fontWeight: '800' }}>
            {formatContribution(trip.contributionCents)} / kişi katkı
          </Text>
          <Text variant="caption">
            {trip.status === 'in_progress'
              ? `${formatRideTravelers(trip)} yolda`
              : `${trip.availableSeats} boş koltuk · ${trip.seatsTotal} toplam`}
          </Text>
          {trip.meetingPoint ? <Text variant="caption">📍 {trip.meetingPoint}</Text> : null}
          {trip.description ? <Text variant="caption" style={{ marginTop: spacing.xs }}>{trip.description}</Text> : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.driverRow}>
            {trip.driverAvatarUrl ? (
              <Image source={{ uri: trip.driverAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: RIDES_ACCENT }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{trip.driverName?.[0] ?? '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text variant="label">{trip.driverName ?? trip.driverUsername ?? 'Sürücü'}</Text>
              {driverRating != null ? (
                <Text variant="caption">⭐ {driverRating} · {trip.vehicleBrand} {trip.vehicleModel}</Text>
              ) : (
                <Text variant="caption">{trip.vehicleBrand} {trip.vehicleModel}</Text>
              )}
            </View>
          </View>
          {trust ? <RideTrustBadgesView badges={trust} compact /> : null}
        </GlassCard>

        <View style={[styles.trustStrip, { backgroundColor: `${RIDES_ACCENT}14` }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={RIDES_ACCENT} />
          <Text variant="caption" style={{ flex: 1, color: RIDES_ACCENT }}>
            Paylaşımlı yolculuk — masraf paylaşımı, ticari taşıma değildir
          </Text>
        </View>

        {/* Passenger actions */}
        {!isDriver && trip.status === 'published' && !myReservation ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Koltuk rezerve et</Text>
            {trip.stops?.length ? (
              <>
                <Text variant="caption" secondary style={{ marginTop: spacing.xs }}>
                  Nereden bineceksiniz?
                </Text>
                <Pressable
                  onPress={() => setPickupStopId(null)}
                  style={[styles.pickupOption, !pickupStopId && { borderColor: RIDES_ACCENT, backgroundColor: `${RIDES_ACCENT}12` }]}
                >
                  <Text variant="caption">{rideCityName(trip.fromCityId)} (kalkış)</Text>
                </Pressable>
                {trip.stops.map((s) => (
                  <Pressable
                    key={s.id ?? s.cityId}
                    onPress={() => setPickupStopId(s.id ?? null)}
                    style={[styles.pickupOption, pickupStopId === s.id && { borderColor: RIDES_ACCENT, backgroundColor: `${RIDES_ACCENT}12` }]}
                  >
                    <Text variant="caption">{rideCityName(s.cityId)} (ara durak)</Text>
                  </Pressable>
                ))}
              </>
            ) : null}
            <RidePassengerDetailsForm
              value={passengerDetails}
              onChange={setPassengerDetails}
              womenOnly={trip.womenOnly}
            />
            <Input label="Koltuk sayısı" value={seatCount} onChangeText={setSeatCount} keyboardType="number-pad" />
            <Input label="Not (opsiyonel)" value={note} onChangeText={setNote} />
            <RideReservationPolicyCard
              accepted={policyAccepted}
              onToggleAccepted={() => setPolicyAccepted((v) => !v)}
              amountLabel={formatContribution(
                trip.contributionCents * (parseInt(seatCount, 10) || 1),
              )}
            />
            {showTripReserve ? (
            <Button
              title="Kartı kaydet ve talep gönder"
              loading={acting}
              onPress={handleReserve}
              disabled={!policyAccepted}
            />
            ) : null}
            <Text variant="caption" secondary>
              Kart doğrulaması Stripe ile · katkı payı şoför onayında tahsil edilir
            </Text>
            <Pressable onPress={() => router.push(ridesSupportPath() as never)} style={styles.linkRow}>
              <Ionicons name="headset-outline" size={14} color={RIDES_ACCENT} />
              <Text variant="caption" style={{ color: RIDES_ACCENT }}>
                Şoför şikayeti ve canlı destek
              </Text>
            </Pressable>
          </GlassCard>
        ) : null}

        {myReservation ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Rezervasyonunuz</Text>
            <Text variant="caption">{RESERVATION_STATUS_LABELS[myReservation.status]}</Text>
            <Text variant="caption">{PAYMENT_STATUS_LABELS[myReservation.paymentStatus] ?? myReservation.paymentStatus}</Text>
            <Text variant="caption">{myReservation.seatCount} koltuk · {formatContribution(myReservation.amountCents)}</Text>
            {myReservation.status === 'pending' && myReservation.paymentStatus === 'pending' && showTripPay ? (
              <Button title="Ödemeyi tamamla" loading={acting} onPress={handleCompletePayment} style={{ marginTop: spacing.sm }} />
            ) : null}
            {myReservation.status === 'approved' && showTripChat ? (
              <Button title="Trip sohbet" variant="outline" onPress={openChat} style={{ marginTop: spacing.sm }} />
            ) : null}
            {myReservation.status === 'completed' && showTripReview ? (
              <>
                <Text variant="caption" style={{ marginTop: spacing.sm }}>
                  Sürücüyü puanlayın
                </Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setReviewRating(n)}>
                      <Ionicons name={n <= reviewRating ? 'star' : 'star-outline'} size={28} color="#FFB300" />
                    </Pressable>
                  ))}
                </View>
                <Button title="Puan gönder" onPress={handleReview} />
              </>
            ) : null}
            {canCancelReservation && showTripCancel ? (
              <Button title="Rezervasyonu iptal et" variant="outline" loading={acting} onPress={handleCancelReservation} style={{ marginTop: spacing.sm }} />
            ) : null}
            {showTripRefund && ['held', 'released', 'refund_pending'].includes(myReservation.paymentStatus) ? (
              <Button
                title="İade talebi oluştur"
                variant="outline"
                onPress={() =>
                  router.push(
                    rideRefundRequestPath({
                      tripId: trip.id,
                      reservationId: myReservation.id,
                    }) as never,
                  )
                }
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
            <Pressable onPress={() => router.push(ridesSupportPath() as never)} style={styles.linkRow}>
              <Ionicons name="headset-outline" size={14} color={RIDES_ACCENT} />
              <Text variant="caption" style={{ color: RIDES_ACCENT }}>
                Şoför şikayeti ve canlı destek
              </Text>
            </Pressable>
            {showTripPdf ? (
            <Button title="PDF bilet" variant="outline" onPress={handlePdf} style={{ marginTop: spacing.sm }} />
            ) : null}
          </GlassCard>
        ) : null}

        {/* Driver actions */}
        {isDriver ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Sürücü paneli</Text>
            {trip.status === 'draft' ? (
              <>
                {showTripEdit ? (
                <Button title="Düzenle" variant="outline" onPress={() => router.push(ridesCreatePath(trip.id) as never)} style={{ marginTop: spacing.sm }} />
                ) : null}
                {showTripPublish ? (
                <Button title="Yayınla" onPress={handlePublish} style={{ marginTop: spacing.sm }} />
                ) : null}
              </>
            ) : null}
            {(trip.status === 'published' || trip.status === 'full') && showTripStart ? (
              <Button title="Erken başlat" loading={acting} onPress={handleStart} style={{ marginTop: spacing.sm }} />
            ) : null}
            {trip.status === 'in_progress' ? (
              <>
                {showTripComplete ? (
                <Button title="Yolculuğu tamamla" loading={acting} onPress={handleComplete} style={{ marginTop: spacing.sm }} />
                ) : null}
              </>
            ) : null}
            {trip.status !== 'completed' && trip.status !== 'cancelled' && showTripCancel ? (
              <Button title="İptal et" variant="outline" onPress={handleCancel} style={{ marginTop: spacing.sm }} />
            ) : null}
            {trip.status !== 'draft' && showTripChat ? (
              <Button title="Trip sohbet" variant="outline" onPress={openChat} style={{ marginTop: spacing.sm }} />
            ) : null}
          </GlassCard>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: spacing.md, padding: spacing.sm },
  back: { marginBottom: spacing.sm },
  hero: { width: '100%', height: 180, borderRadius: radius.xl, marginBottom: spacing.md },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  route: { fontWeight: '900', marginBottom: 4 },
  card: { marginTop: spacing.md, gap: spacing.xs },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  stars: { flexDirection: 'row', gap: 4, marginVertical: spacing.sm },
  prefTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  prefTag: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  pickupOption: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    marginTop: spacing.xs,
  },
  pendingSection: { marginTop: spacing.md, gap: spacing.sm },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pendingTitle: { color: RIDES_ACCENT, fontWeight: '800' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
