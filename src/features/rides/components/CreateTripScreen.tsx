import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ListingFormSection } from '@/features/marketplace/components/ListingFormSection';
import { RideCityField, RideCityPicker } from '@/features/rides/components/RideCityPicker';
import { RideDepartureFields } from '@/features/rides/components/RideDepartureFields';
import { RideVehiclePicker, RideVehicleOption, RideVehicleSelectField } from '@/features/rides/components/RideVehiclePicker';
import { RideRoutePreview } from '@/features/rides/components/RideRoutePreview';
import {
  computeDriverPayout,
  registerVehicleAddPath,
  maxRidePassengerSeats,
  rideCityName,
  RIDES_ACCENT,
  RIDE_MIN_CONTRIBUTION_CENTS,
  TRIP_TYPE_OPTIONS,
  rideRoutePreviewPath,
  tripDetailPath,
  VEHICLE_VERIFICATION_LABELS,
} from '@/features/rides/constants';
import { estimateRideDurationMinutes } from '@/features/rides/utils/estimateRouteDuration';
import { createRideTrip, fetchRideTrip, publishRideTrip, updateRideTripDraft } from '@/features/rides/services/tripData';
import { fetchUserVehicles, isVehicleApprovedForPublish } from '@/features/rides/services/vehicleData';
import { hasApprovedLicense } from '@/features/rides/services/licenseData';
import type { RideTripType, RideVehicle } from '@/features/rides/types';
import {
  defaultRideDepartureAt,
  departureAtToIsoDate,
  departureAtToTimeInput,
  parseRideDepartureAt,
} from '@/features/rides/utils/dateFormat';
import { isFutureRideDeparture, normalizeRideDepartureTime } from '@/features/rides/utils/rideTimezone';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type CityPickerMode = 'from' | 'to' | 'stops' | null;

export function CreateTripScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string | string[] }>();
  const editId = Array.isArray(params.editId) ? params.editId[0] : params.editId;
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const regionId = resolveMarketplaceRegionId(profile?.region_id);

  const [vehicles, setVehicles] = useState<RideVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [fromCityId, setFromCityId] = useState('trabzon');
  const [toCityId, setToCityId] = useState('samsun');
  const [stops, setStops] = useState<string[]>([]);
  const [departureAt, setDepartureAt] = useState(defaultRideDepartureAt);
  const [contribution, setContribution] = useState('');
  const [seatsTotal, setSeatsTotal] = useState('3');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [description, setDescription] = useState('');
  const [tripType, setTripType] = useState<RideTripType>('one_way');
  const [luggage] = useState<'small'>('small');
  const [musicPreference] = useState<'any'>('any');
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cityPicker, setCityPicker] = useState<CityPickerMode>(null);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!editId);

  useEffect(() => {
    if (!user?.id) return;
    void fetchUserVehicles(user.id).then((v) => {
      setVehicles(v);
      if (v[0] && !editId) setVehicleId(v[0].id);
    });
  }, [user?.id, editId]);

  useEffect(() => {
    if (!editId || !user?.id) return;
    void fetchRideTrip(editId, user.id).then((t) => {
      setLoadingDraft(false);
      if (!t || t.status !== 'draft' || t.driverId !== user.id) {
        Alert.alert('Düzenlenemez', 'Yalnızca kendi taslak yolculuklarınızı düzenleyebilirsiniz.');
        router.back();
        return;
      }
      setFromCityId(t.fromCityId);
      setToCityId(t.toCityId);
      setStops(t.stops?.map((s) => s.cityId) ?? []);
      setDepartureAt(parseRideDepartureAt(t.departureDate, t.departureTime));
      setContribution(String(t.contributionCents / 100));
      setSeatsTotal(String(t.seatsTotal));
      setMeetingPoint(t.meetingPoint ?? '');
      setDescription(t.description ?? '');
      setTripType(t.tripType);
      setSmokingAllowed(t.smokingAllowed);
      setPetsAllowed(t.petsAllowed);
      setWomenOnly(t.womenOnly);
      if (t.vehicleId) setVehicleId(t.vehicleId);
    });
  }, [editId, user?.id]);

  const contributionCents = Math.round(parseFloat(contribution.replace(',', '.')) * 100) || 0;
  const seats = parseInt(seatsTotal, 10) || 1;
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const maxSeats = selectedVehicle ? maxRidePassengerSeats(selectedVehicle.seatsTotal) : null;
  const payout = computeDriverPayout(contributionCents, seats);

  const toggleStop = (cityId: string) => {
    setStops((prev) => (prev.includes(cityId) ? prev.filter((s) => s !== cityId) : [...prev, cityId]));
  };

  const handleSubmit = async (publish: boolean) => {
    if (!user?.id) return;
    if (!vehicleId) {
      Alert.alert('Araç gerekli', 'Önce bir araç kaydedin.', [
        { text: 'Tamam' },
        { text: 'Araç ekle', onPress: () => router.push(registerVehicleAddPath() as never) },
      ]);
      return;
    }
    const isoDate = departureAtToIsoDate(departureAt);
    const departureTime = departureAtToTimeInput(departureAt);
    if (contributionCents < RIDE_MIN_CONTRIBUTION_CENTS) {
      Alert.alert('Katkı payı', `Minimum kişi başı katkı ${RIDE_MIN_CONTRIBUTION_CENTS / 100} TL olmalı.`);
      return;
    }
    if (fromCityId === toCityId) {
      Alert.alert('Rota', 'Nereden ve nereye farklı olmalı.');
      return;
    }
    if (publish && !isFutureRideDeparture(isoDate, departureTime)) {
      Alert.alert('Tarih / saat', 'Yayınlamak için kalkış tarihi ve saati şu andan sonra olmalı.');
      return;
    }
    if (publish) {
      if (!isVehicleApprovedForPublish(selectedVehicle)) {
        Alert.alert('Araç onayı gerekli', 'Yayınlamak için seçili aracınızın admin tarafından onaylanmış olması gerekir.', [
          { text: 'Tamam' },
          { text: 'Araç kaydet', onPress: () => router.push(registerVehicleAddPath() as never) },
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
    }

    const seatCap = selectedVehicle ? maxRidePassengerSeats(selectedVehicle.seatsTotal) : 4;
    if (seats > seatCap) {
      Alert.alert(
        'Koltuk sayısı',
        `Bu araçta en fazla ${seatCap} yolcu koltuğu paylaşılabilir (${selectedVehicle?.seatsTotal} koltuklu araç, sürücü hariç).`,
      );
      return;
    }
    if (seats < 1) {
      Alert.alert('Koltuk sayısı', 'En az 1 boş koltuk girin.');
      return;
    }

    setSaving(true);
    const estimatedDurationMinutes = estimateRideDurationMinutes(fromCityId, toCityId, stops);
    const tripPayload = {
      vehicleId,
      regionId,
      fromCityId,
      toCityId,
      meetingPoint,
      tripType,
      contributionCents,
      seatsTotal: seats,
      departureDate: isoDate,
      departureTime: normalizeRideDepartureTime(departureTime),
      estimatedDurationMinutes,
      description,
      luggage,
      smokingAllowed,
      petsAllowed,
      womenOnly,
      musicPreference,
      stops: stops.map((cityId, i) => ({ cityId, stopOrder: i + 1 })),
      publish,
    };

    if (editId) {
      const { error } = await updateRideTripDraft(editId, tripPayload);
      setSaving(false);
      if (error) {
        Alert.alert('Hata', error);
        return;
      }
      if (publish) {
        const { error: pubError } = await publishRideTrip(editId);
        if (pubError) {
          Alert.alert('Hata', pubError);
          return;
        }
      }
      Alert.alert(
        publish ? 'Yolculuk yayınlandı' : 'Taslak güncellendi',
        publish ? 'Boş koltuklarınız paylaşıldı.' : 'Değişiklikler kaydedildi.',
        [{ text: 'Tamam', onPress: () => router.replace(tripDetailPath(editId) as never) }],
      );
      return;
    }

    const { tripId, error } = await createRideTrip(user.id, tripPayload);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert(
      publish ? 'Yolculuk yayınlandı' : 'Taslak kaydedildi',
      publish ? 'Boş koltuklarınız paylaşıldı.' : 'Taslak olarak kaydedildi.',
      [{ text: 'Tamam', onPress: () => router.replace(tripDetailPath(tripId!) as never) }],
    );
  };

  const stopsLabel =
    stops.length > 0 ? stops.map((id) => rideCityName(id)).join(', ') : null;

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={48}
      >
        <AuthHeader title={editId ? 'Taslak Düzenle' : 'Yolculuk Paylaş'} showBack />
        <Text secondary variant="caption" style={styles.disclaimer}>
          Paylaşımlı yolculuktur — boş koltuk ve masraf paylaşımı. Ticari taşıma hizmeti değildir.
        </Text>

        <ListingFormSection step={1} title="Rota">
          <RideCityField label="Nereden" value={fromCityId} onPress={() => setCityPicker('from')} />
          <RideCityField label="Nereye" value={toCityId} onPress={() => setCityPicker('to')} />
          <RideCityField
            label="Ara duraklar (opsiyonel)"
            value={null}
            displayText={stopsLabel ?? undefined}
            placeholder="Durak ekle…"
            onPress={() => setCityPicker('stops')}
          />
          <RideRoutePreview fromCityId={fromCityId} toCityId={toCityId} stopCityIds={stops} />
          {fromCityId !== toCityId ? (
            <Button
              title="Haritada güzergah"
              variant="outline"
              onPress={() => router.push(rideRoutePreviewPath(fromCityId, toCityId, stops) as never)}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
          <Input label="Buluşma noktası" value={meetingPoint} onChangeText={setMeetingPoint} placeholder="Örn. Otogar önü" />
        </ListingFormSection>

        <ListingFormSection step={2} title="Zaman">
          <RideDepartureFields value={departureAt} onChange={setDepartureAt} enforceFutureDeparture />
        </ListingFormSection>

        <ListingFormSection step={3} title="Koltuk & Katkı Payı">
          <Input label="Boş koltuk sayısı" value={seatsTotal} onChangeText={setSeatsTotal} keyboardType="number-pad" />
          {maxSeats != null ? (
            <Text variant="caption" secondary>
              Seçili araç için en fazla {maxSeats} yolcu koltuğu ({selectedVehicle?.seatsTotal} koltuklu, sürücü hariç)
            </Text>
          ) : null}
          <Input
            label="Kişi başı katkı payı (TL)"
            value={contribution}
            onChangeText={setContribution}
            keyboardType="decimal-pad"
            placeholder="500"
          />
          {contributionCents > 0 ? (
            <View style={[styles.payoutBox, { backgroundColor: `${RIDES_ACCENT}12` }]}>
              <Text variant="caption">
                {seats} koltuk × {contributionCents / 100} TL = {payout.grossCents / 100} TL brüt
              </Text>
              <Text variant="caption" style={{ fontWeight: '700', color: RIDES_ACCENT }}>
                Sürücü net: ~{payout.netCents / 100} TL (%10 platform)
              </Text>
            </View>
          ) : null}
        </ListingFormSection>

        <ListingFormSection step={4} title="Tercihler">
          {TRIP_TYPE_OPTIONS.map((o) => (
            <Pressable key={o.id} onPress={() => setTripType(o.id)} style={styles.row}>
              <Ionicons name={tripType === o.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={RIDES_ACCENT} />
              <Text variant="caption">{o.label}</Text>
            </Pressable>
          ))}
          <View style={styles.switchRow}>
            <Text variant="caption">Sigara içilebilir</Text>
            <Switch value={smokingAllowed} onValueChange={setSmokingAllowed} trackColor={{ true: RIDES_ACCENT }} />
          </View>
          <View style={styles.switchRow}>
            <Text variant="caption">Evcil hayvan kabul</Text>
            <Switch value={petsAllowed} onValueChange={setPetsAllowed} trackColor={{ true: RIDES_ACCENT }} />
          </View>
          <View style={styles.switchRow}>
            <Text variant="caption">Kadınlara özel</Text>
            <Switch value={womenOnly} onValueChange={setWomenOnly} trackColor={{ true: RIDES_ACCENT }} />
          </View>
        </ListingFormSection>

        <ListingFormSection step={5} title="Araç">
          {vehicles.length === 0 ? (
            <Button title="Araç kaydet" variant="outline" onPress={() => router.push(registerVehicleAddPath() as never)} />
          ) : vehicles.length === 1 && selectedVehicle ? (
            <RideVehicleOption vehicle={selectedVehicle} selected readonly compact />
          ) : (
            <RideVehicleSelectField
              vehicle={selectedVehicle}
              placeholder="Araç seçin"
              onPress={() => setVehiclePickerOpen(true)}
            />
          )}
          {selectedVehicle?.coverUrl ? (
            <View style={styles.vehiclePreviewWrap}>
              <Image source={{ uri: selectedVehicle.coverUrl }} style={styles.vehiclePreview} resizeMode="cover" />
              <Text variant="caption" secondary style={{ marginTop: spacing.xs }}>
                Yolcular bu görseli listede görecek
              </Text>
            </View>
          ) : null}
        </ListingFormSection>

        <ListingFormSection step={6} title="Açıklama">
          <Input
            label="Not (opsiyonel)"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Müzik, mola, bagaj detayı…"
          />
        </ListingFormSection>

        <Button title={editId ? 'Kaydet ve yayınla' : 'Yayınla'} loading={saving || loadingDraft} onPress={() => handleSubmit(true)} />
        {selectedVehicle && selectedVehicle.verificationStatus !== 'approved' ? (
          <Text variant="caption" style={{ marginTop: spacing.sm, color: colors.warning, textAlign: 'center' }}>
            {VEHICLE_VERIFICATION_LABELS[selectedVehicle.verificationStatus]} — yayın için admin panelinden araç onayı gerekir (ehliyet tek başına yetmez).
          </Text>
        ) : null}
        <Button title={editId ? 'Taslak kaydet' : 'Taslak kaydet'} variant="outline" loading={saving || loadingDraft} onPress={() => handleSubmit(false)} style={{ marginTop: spacing.sm }} />
        <View style={{ height: spacing.xxl }} />
      </KeyboardAwareScrollView>

      <RideCityPicker
        visible={cityPicker === 'from'}
        title="Nereden"
        selectedId={fromCityId}
        onClose={() => setCityPicker(null)}
        onSelect={setFromCityId}
      />
      <RideCityPicker
        visible={cityPicker === 'to'}
        title="Nereye"
        selectedId={toCityId}
        onClose={() => setCityPicker(null)}
        onSelect={setToCityId}
      />
      <RideCityPicker
        visible={cityPicker === 'stops'}
        title="Ara duraklar"
        multi
        selectedIds={stops}
        excludeIds={[fromCityId, toCityId]}
        onClose={() => setCityPicker(null)}
        onSelect={() => {}}
        onToggle={toggleStop}
      />
      <RideVehiclePicker
        visible={vehiclePickerOpen}
        vehicles={vehicles}
        selectedId={vehicleId}
        onClose={() => setVehiclePickerOpen(false)}
        onSelect={setVehicleId}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl * 2 },
  disclaimer: { marginBottom: spacing.md, lineHeight: 18 },
  payoutBox: { padding: spacing.sm, borderRadius: radius.lg, gap: 4, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  vehiclePreviewWrap: { marginTop: spacing.sm },
  vehiclePreview: { width: '100%', height: 160, borderRadius: radius.xl, backgroundColor: '#ddd' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
});
