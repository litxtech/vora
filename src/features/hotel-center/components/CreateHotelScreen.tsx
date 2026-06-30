import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { LocationPicker, type SelectedLocation } from '@/features/compose/components/LocationPicker';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { HotelRoomTypesEditor } from '@/features/hotel-center/components/HotelRoomTypesEditor';
import {
  HOTEL_ACCENT,
  HOTEL_AMENITIES,
  HOTEL_DESCRIPTION_MIN,
  HOTEL_GRADIENT,
  HOTEL_MAX_PHOTOS,
  HOTEL_MAX_VIDEOS,
  deriveHotelListingFromRoomTypes,
  hotelDetailPath,
  validateHotelListingFields,
  validateHotelRoomTypes,
} from '@/features/hotel-center/constants';
import {
  createHotelListing,
  fetchHotelForEdit,
  removeHotelListing,
  updateHotelListing,
} from '@/features/hotel-center/services/hotelData';
import { uploadHotelImages, uploadHotelVideos } from '@/features/hotel-center/services/hotelMediaUpload';
import {
  createEmptyDraftRoomType,
  fetchHotelRoomTypes,
  hotelRoomTypeToDraft,
  parseDraftRoomTypesForValidation,
  saveHotelRoomTypes,
} from '@/features/hotel-center/services/hotelRoomTypes';
import type { DraftHotelRoomType, HotelListingStatus } from '@/features/hotel-center/types';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function resolveHotelListingDistrict(selectedLocation: SelectedLocation | null, district: string): string {
  const placeLabel = selectedLocation?.label?.trim();
  const districtText = district.trim();
  if (placeLabel && selectedLocation?.source !== 'gps') {
    return placeLabel;
  }
  return districtText || placeLabel || '';
}

function FormSection({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[`${HOTEL_ACCENT}44`, `${HOTEL_ACCENT}22`]} style={styles.stepBadge}>
          <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '800' }}>
            {step}
          </Text>
        </LinearGradient>
        <View style={styles.sectionTitles}>
          <Text variant="label">{title}</Text>
          {subtitle ? <Text secondary variant="caption">{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PhotoTile({
  uri,
  index,
  onRemove,
  onSetCover,
}: {
  uri: string;
  index: number;
  onRemove: () => void;
  onSetCover: () => void;
}) {
  const { colors } = useTheme();
  const isCover = index === 0;
  return (
    <View style={styles.photoTile}>
      <Pressable
        onPress={onSetCover}
        onLongPress={onRemove}
        style={[styles.photoFrame, { borderColor: isCover ? HOTEL_ACCENT : colors.border, backgroundColor: colors.surfaceElevated }]}
      >
        <Image source={{ uri }} style={styles.photo} />
        <Pressable onPress={onRemove} hitSlop={6} style={[styles.photoRemove, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
          <Ionicons name="close" size={12} color="#fff" />
        </Pressable>
      </Pressable>
      <Text variant="caption" numberOfLines={1} style={[styles.photoCaption, { color: isCover ? HOTEL_ACCENT : colors.textMuted, fontWeight: isCover ? '700' : '500' }]}>
        {isCover ? 'Kapak görseli' : `Görsel ${index + 1}`}
      </Text>
    </View>
  );
}

type Props = { editHotelId?: string };

export function CreateHotelScreen({ editHotelId: editHotelIdProp }: Props) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;
  const editHotelId = editHotelIdProp ?? paramId;
  const isEdit = Boolean(editHotelId);

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [studentDiscountPct, setStudentDiscountPct] = useState('0');
  const [studentDiscountNote, setStudentDiscountNote] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [videoUris, setVideoUris] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<DraftHotelRoomType[]>([createEmptyDraftRoomType('Standart Oda')]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [status, setStatus] = useState<HotelListingStatus>('published');
  const [saving, setSaving] = useState(false);
  const [loadingHotel, setLoadingHotel] = useState(isEdit);
  const [regionId, setRegionId] = useState<RegionId>((profile?.region_id as RegionId) ?? 'trabzon');

  useEffect(() => {
    if (!user?.id || isEdit) return;
    void fetchBusinessAccountByOwner(user.id).then((biz) => {
      if (biz?.regionId) setRegionId(biz.regionId as RegionId);
    });
  }, [user?.id, isEdit]);

  const districts = DISTRICTS[regionId as RegionId] ?? [];
  const discountNum = Math.min(70, Math.max(0, parseInt(studentDiscountPct, 10) || 0));
  const parsedRoomTypes = parseDraftRoomTypesForValidation(roomTypes);
  const derivedListing = deriveHotelListingFromRoomTypes(parsedRoomTypes);
  const priceNum = derivedListing.pricePerNight;
  const totalRoomsNum = derivedListing.totalRooms;
  const occupiedRoomsNum = derivedListing.occupiedRooms;

  useEffect(() => {
    if (!isEdit || !editHotelId || !user?.id) return;
    setLoadingHotel(true);
    fetchHotelForEdit(editHotelId, user.id).then(async (record) => {
      setLoadingHotel(false);
      if (!record) {
        Alert.alert('Düzenlenemez', 'Otel bulunamadı veya yetkiniz yok.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }
      setName(record.name);
      setDescription(record.description);
      setDistrict(record.district ?? '');
      setStudentDiscountPct(String(record.studentDiscountPct));
      setStudentDiscountNote(record.studentDiscountNote ?? '');
      setPhone(record.phone ?? '');
      setWhatsapp(record.whatsapp ?? '');
      setAmenities(record.amenities);
      setPhotoUris(record.mediaUrls);
      setVideoUris(record.videoUrls);
      setStatus(record.status);
      const rooms = await fetchHotelRoomTypes(editHotelId);
      setRoomTypes(rooms.length ? rooms.map(hotelRoomTypeToDraft) : [createEmptyDraftRoomType('Standart Oda')]);
      if (record.latitude != null && record.longitude != null) {
        setSelectedLocation({
          label: record.district ?? record.name,
          latitude: record.latitude,
          longitude: record.longitude,
          source: 'gps',
        });
      }
    });
  }, [isEdit, editHotelId, user?.id]);

  const pickPhotos = async () => {
    const remaining = HOTEL_MAX_PHOTOS - photoUris.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, HOTEL_MAX_PHOTOS));
    }
  };

  const pickVideos = async () => {
    const remaining = HOTEL_MAX_VIDEOS - videoUris.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      videoMaxDuration: 90,
    });
    if (!result.canceled) {
      setVideoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, HOTEL_MAX_VIDEOS));
    }
  };

  const toggleAmenity = (id: string) => {
    setAmenities((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    const validationError = validateHotelListingFields({
      name,
      description,
      pricePerNight: priceNum,
      totalRooms: totalRoomsNum,
      occupiedRooms: occupiedRoomsNum,
      studentDiscountPct: discountNum,
    });
    const roomValidationError = validateHotelRoomTypes(parsedRoomTypes);
    if (validationError || roomValidationError) {
      Alert.alert('Eksik veya hatalı bilgi', validationError ?? roomValidationError ?? '');
      return;
    }

    setSaving(true);

    const { error: profileError } = await ensureCurrentUserProfile();
    if (profileError) {
      setSaving(false);
      Alert.alert('Profil hatası', profileError);
      return;
    }

    let latitude = selectedLocation?.latitude ?? undefined;
    let longitude = selectedLocation?.longitude ?? undefined;
    if (latitude == null || longitude == null) {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    }

    const localPhotos = photoUris.filter((u) => !u.startsWith('http'));
    const remotePhotos = photoUris.filter((u) => u.startsWith('http'));
    const uploadedPhotos = localPhotos.length ? await uploadHotelImages(user.id, localPhotos) : [];
    const mediaUrls = [...remotePhotos, ...uploadedPhotos].slice(0, HOTEL_MAX_PHOTOS);

    const localVideos = videoUris.filter((u) => !u.startsWith('http'));
    const remoteVideos = videoUris.filter((u) => u.startsWith('http'));
    const uploadedVideos = localVideos.length ? await uploadHotelVideos(user.id, localVideos) : [];
    const videoUrls = [...remoteVideos, ...uploadedVideos].slice(0, HOTEL_MAX_VIDEOS);

    const input = {
      name: name.trim(),
      description: description.trim(),
      district: resolveHotelListingDistrict(selectedLocation, district),
      pricePerNight: priceNum,
      listPricePerNight: derivedListing.listPricePerNight,
      studentDiscountPct: discountNum,
      studentDiscountNote: studentDiscountNote.trim() || undefined,
      amenities,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      mediaUrls,
      videoUrls,
      totalRooms: totalRoomsNum,
      occupiedRooms: occupiedRoomsNum,
      status,
      latitude,
      longitude,
    };

    const persistRoomTypes = async (hotelId: string) => {
      const roomResult = await saveHotelRoomTypes(hotelId, user.id, roomTypes);
      if (roomResult.error) {
        Alert.alert('Oda tipleri kaydedilemedi', roomResult.error);
        return false;
      }
      return true;
    };

    if (isEdit && editHotelId) {
      const result = await updateHotelListing(editHotelId, user.id, input);
      if (result.error) {
        setSaving(false);
        Alert.alert('Hata', result.error);
        return;
      }
      const roomsOk = await persistRoomTypes(editHotelId);
      setSaving(false);
      if (!roomsOk) return;
      Alert.alert('Güncellendi', 'Otel ilanı ve oda tipleri kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(hotelDetailPath(editHotelId) as never) },
      ]);
      return;
    }

    const result = await createHotelListing(user.id, regionId, input);
    setSaving(false);
    if (result.error && !result.id) {
      Alert.alert('Hata', result.error);
      return;
    }
    if (result.error && result.id) {
      Alert.alert('Kısmen kaydedildi', result.error, [
        { text: 'Vitrine git', onPress: () => router.replace('/business-center/shop-curate' as never) },
      ]);
      return;
    }
    if (result.id) {
      const roomsOk = await persistRoomTypes(result.id);
      if (!roomsOk) {
        Alert.alert('Otel oluşturuldu', 'Oda tipleri kaydedilemedi; düzenleme ekranından tekrar deneyin.', [
          { text: 'Düzenle', onPress: () => router.replace(`/hotel-center/edit/${result.id}` as never) },
        ]);
        return;
      }
      Alert.alert('Yayınlandı', 'Otel ilanınız ve oda tipleri oluşturuldu.', [
        { text: 'Mağaza vitrini', onPress: () => router.replace('/business-center/shop-curate' as never) },
        { text: 'Otel detayı', onPress: () => router.replace(hotelDetailPath(result.id!) as never) },
      ]);
    }
  };

  const handleRemove = () => {
    if (!editHotelId || !user?.id) return;
    Alert.alert('Oteli Kaldır', 'İlan kalıcı olarak silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          const result = await removeHotelListing(editHotelId, user.id);
          setSaving(false);
          if (result.error) Alert.alert('Hata', result.error);
          else router.replace('/hotel-center' as never);
        },
      },
    ]);
  };

  if (loadingHotel) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={HOTEL_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <LinearGradient
            colors={[`${HOTEL_GRADIENT[0]}22`, `${HOTEL_GRADIENT[1]}10`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderColor: `${HOTEL_ACCENT}33` }]}
          >
            <View style={[styles.heroIcon, { backgroundColor: HOTEL_ACCENT }]}>
              <Ionicons name={isEdit ? 'create' : 'bed'} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontWeight: '800' }}>
                {isEdit ? 'Oteli Düzenle' : 'Otel Ekle'}
              </Text>
              <Text secondary variant="caption">
                {isEdit ? 'Oda tiplerini güncelleyin' : 'Standart, deluxe, süit… farklı odalarınızı ekleyin'}
              </Text>
            </View>
          </LinearGradient>

          <FormSection step={1} title="Temel bilgi" subtitle="Otel adı ve açıklama">
            <Input label="Otel Adı" value={name} onChangeText={setName} placeholder="Örn: Karadeniz Butik Otel" />
            <Input
              label="Açıklama"
              value={description}
              onChangeText={setDescription}
              placeholder="Konum, atmosfer, öğrencilere sunduğunuz avantajlar…"
              hint={`En az ${HOTEL_DESCRIPTION_MIN} karakter`}
              multiline
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
            {districts.length > 0 ? (
              <OptionPicker label="İlçe" value={district} options={districts.map((d) => ({ id: d, label: d }))} onChange={setDistrict} />
            ) : (
              <Input label="İlçe" value={district} onChangeText={setDistrict} />
            )}
            <Input label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
            <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="Opsiyonel" keyboardType="phone-pad" />
          </FormSection>

          <FormSection
            step={2}
            title={isEdit ? 'Görselleri düzenle' : 'Görseller'}
            subtitle={`Kapak için dokunun · ${photoUris.length}/${HOTEL_MAX_PHOTOS} görsel`}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
              <Pressable onPress={pickPhotos} style={[styles.photoAdd, { borderColor: `${HOTEL_ACCENT}55` }]}>
                <LinearGradient colors={[`${HOTEL_ACCENT}22`, `${HOTEL_ACCENT}08`]} style={styles.photoAddInner}>
                  <Ionicons name="add" size={28} color={HOTEL_ACCENT} />
                </LinearGradient>
              </Pressable>
              {photoUris.map((uri, i) => (
                <PhotoTile
                  key={`${uri}-${i}`}
                  uri={uri}
                  index={i}
                  onRemove={() => setPhotoUris((prev) => prev.filter((_, idx) => idx !== i))}
                  onSetCover={() => {
                    if (i === 0) return;
                    setPhotoUris((prev) => {
                      const next = [...prev];
                      const [item] = next.splice(i, 1);
                      next.unshift(item);
                      return next;
                    });
                  }}
                />
              ))}
            </ScrollView>
            <Text secondary variant="caption">
              İlk sıradaki görsel kapaktır. Dokunarak kapak değiştirin, X ile kaldırın.
            </Text>
          </FormSection>

          <FormSection step={3} title="Otel videoları" subtitle={`Tanıtım videosu · ${videoUris.length}/${HOTEL_MAX_VIDEOS}`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
              <Pressable onPress={pickVideos} style={[styles.photoAdd, { borderColor: `${HOTEL_ACCENT}55` }]}>
                <LinearGradient colors={[`${HOTEL_ACCENT}22`, `${HOTEL_ACCENT}08`]} style={styles.photoAddInner}>
                  <Ionicons name="videocam" size={26} color={HOTEL_ACCENT} />
                </LinearGradient>
              </Pressable>
              {videoUris.map((uri, i) => (
                <View key={`${uri}-${i}`} style={styles.photoTile}>
                  <View style={[styles.photoFrame, { borderColor: colors.border, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="play-circle" size={32} color={HOTEL_ACCENT} />
                    <Pressable
                      onPress={() => setVideoUris((prev) => prev.filter((_, idx) => idx !== i))}
                      hitSlop={6}
                      style={[styles.photoRemove, { backgroundColor: colors.danger, borderColor: colors.surface }]}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                  <Text variant="caption" numberOfLines={1} style={[styles.photoCaption, { color: colors.textMuted }]}>
                    Video {i + 1}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </FormSection>

          <FormSection
            step={4}
            title="Oda tipleri"
            subtitle={`Fiyat ve kapasite oda bazında · ${roomTypes.length} tip`}
          >
            <HotelRoomTypesEditor
              roomTypes={roomTypes}
              onChange={setRoomTypes}
              showOccupied={isEdit}
            />
            <Text secondary variant="caption">
              Vitrinde “{priceNum > 0 ? `${priceNum.toLocaleString('tr-TR')} ₺` : '—'}”den başlayan fiyat gösterilir.
              Toplam {totalRoomsNum} oda · {Math.max(0, totalRoomsNum - occupiedRoomsNum)} müsait.
            </Text>
          </FormSection>

          <FormSection step={5} title="Öğrenci indirimi" subtitle="Tüm oda tiplerine uygulanır">
            <Input
              label="Öğrenci İndirimi (%)"
              value={studentDiscountPct}
              onChangeText={setStudentDiscountPct}
              keyboardType="number-pad"
              placeholder="0–70"
            />
            <Input
              label="İndirim Açıklaması"
              value={studentDiscountNote}
              onChangeText={setStudentDiscountNote}
              placeholder="Örn: Öğrenci kartı ile geçerli"
            />
          </FormSection>

          <FormSection step={6} title="Olanaklar" subtitle="Misafirlerin aradığı özellikler">
            <View style={styles.amenityGrid}>
              {HOTEL_AMENITIES.map((a) => {
                const selected = amenities.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => toggleAmenity(a.id)}
                    style={[styles.amenityChip, { borderColor: selected ? HOTEL_ACCENT : colors.border, backgroundColor: selected ? `${HOTEL_ACCENT}16` : colors.surfaceElevated }]}
                  >
                    <Ionicons name={a.icon as keyof typeof Ionicons.glyphMap} size={14} color={selected ? HOTEL_ACCENT : colors.textMuted} />
                    <Text variant="caption" style={{ color: selected ? HOTEL_ACCENT : colors.textSecondary, fontWeight: selected ? '700' : '400' }}>
                      {a.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FormSection>

          <FormSection step={7} title="Harita konumu" subtitle="Uzungöl gibi yer adları mağaza vitrininde görünür">
            <LocationPicker
              regionId={regionId as RegionId}
              value={selectedLocation}
              onChange={(loc) => {
                setSelectedLocation(loc);
                if (loc?.label?.trim() && loc.source !== 'gps') {
                  setDistrict(loc.label.trim());
                }
              }}
            />
            <Text secondary variant="caption">
              Haritadan yer seçerseniz (ör. Uzungöl) vitrinde o isim gösterilir. Seçilmezse ilçe veya GPS kullanılır.
            </Text>
          </FormSection>

          <OptionPicker
            label="Yayın Durumu"
            value={status}
            options={[
              { id: 'published', label: 'Yayında' },
              { id: 'draft', label: 'Taslak' },
              { id: 'paused', label: 'Duraklatıldı' },
            ]}
            onChange={(v) => setStatus(v as HotelListingStatus)}
          />

          <Button title={isEdit ? 'Kaydet' : 'Yayınla'} onPress={() => void handleSubmit()} loading={saving} />
          {isEdit ? <Button title="Oteli Kaldır" variant="outline" onPress={handleRemove} /> : null}
        </View>
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { padding: spacing.lg, gap: spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, paddingBottom: 0 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitles: { flex: 1, gap: 2 },
  sectionBody: { padding: spacing.md, gap: spacing.md },
  photoScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  roomRow: { flexDirection: 'row', gap: spacing.sm },
  photoAdd: { width: 88, height: 88, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  photoAddInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoTile: { width: 88, gap: 4 },
  photoFrame: { width: 88, height: 88, borderRadius: radius.md, borderWidth: 2, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  photoCaption: { textAlign: 'center', fontSize: 10 },
  pricePreview: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1 },
});
