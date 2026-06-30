import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ListingFormSection } from '@/features/marketplace/components/ListingFormSection';
import { RIDE_MAX_PHOTOS, RIDES_ACCENT, VEHICLE_TYPE_OPTIONS } from '@/features/rides/constants';
import { RIDES_FEATURE } from '@/features/rides/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { createVehicle, fetchVehicle, updateVehicle } from '@/features/rides/services/vehicleData';
import type { RideVehicleType } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function RegisterVehicleScreen() {
  const { id: vehicleId } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(vehicleId);
  const { user } = useAuth();
  const showVehiclePhotos = useFeatureVisible(RIDES_FEATURE.vehiclePhotos);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [vehicleType, setVehicleType] = useState<RideVehicleType>('car');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const maxSeats = VEHICLE_TYPE_OPTIONS.find((v) => v.id === vehicleType)?.maxSeats ?? 4;
  const previewUri = photoUris[previewIndex] ?? photoUris[0] ?? null;

  useEffect(() => {
    if (!isEdit || !vehicleId || !user?.id) return;

    let cancelled = false;
    (async () => {
      const vehicle = await fetchVehicle(vehicleId);
      if (cancelled) return;
      if (!vehicle || vehicle.userId !== user.id) {
        Alert.alert('Hata', 'Araç bulunamadı', [{ text: 'Tamam', onPress: () => router.back() }]);
        return;
      }

      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(vehicle.year ? String(vehicle.year) : '');
      setPlate(vehicle.plate);
      setColor(vehicle.color ?? '');
      setVehicleType(vehicle.vehicleType);
      setPhotoUris(vehicle.photoUrls.length > 0 ? vehicle.photoUrls : vehicle.coverUrl ? [vehicle.coverUrl] : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, vehicleId, user?.id]);

  const pickPhotos = async () => {
    const remaining = RIDE_MAX_PHOTOS - photoUris.length;
    if (remaining <= 0) {
      Alert.alert('Limit', `En fazla ${RIDE_MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      setPhotoUris((prev) => {
        const next = [...prev, ...result.assets.map((a) => a.uri)].slice(0, RIDE_MAX_PHOTOS);
        return next;
      });
      if (photoUris.length === 0) setPreviewIndex(0);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex((prev) => {
      if (index < prev) return Math.max(0, prev - 1);
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!brand.trim() || !model.trim() || !plate.trim()) {
      Alert.alert('Eksik bilgi', 'Marka, model ve plaka zorunlu.');
      return;
    }
    if (showVehiclePhotos && !photoUris.length) {
      Alert.alert('Fotoğraf', 'En az bir araç fotoğrafı ekleyin.');
      return;
    }

    const payload = {
      brand,
      model,
      year: year ? parseInt(year, 10) : undefined,
      plate,
      color,
      vehicleType,
      seatsTotal: maxSeats,
      photoUris,
    };

    setSaving(true);
    const result = isEdit && vehicleId
      ? await updateVehicle(vehicleId, user.id, payload)
      : await createVehicle(user.id, payload).then((r) => ({ error: r.error }));
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    Alert.alert(
      isEdit ? 'Güncellendi' : 'Kaydedildi',
      isEdit
        ? 'Araç bilgileri güncellendi. Değişiklikler admin onayı gerektirebilir.'
        : 'Araç admin onayından sonra yolculuk paylaşabilirsiniz.',
      [{ text: 'Tamam', onPress: () => router.back() }],
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loader}>
          <ActivityIndicator color={RIDES_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <AuthHeader title={isEdit ? 'Araç Düzenle' : 'Araç Kaydet'} showBack />

        {showVehiclePhotos ? (
          <ListingFormSection step={1} title="Fotoğraflar">
            {previewUri ? (
              <View style={styles.heroWrap}>
                <Image source={{ uri: previewUri }} style={styles.hero} resizeMode="cover" />
                <View style={styles.heroBadge}>
                  <Text variant="caption" style={styles.heroBadgeText}>
                    {previewIndex === 0 ? 'Kapak fotoğrafı' : `Fotoğraf ${previewIndex + 1}`}
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable onPress={pickPhotos} style={styles.heroEmpty}>
                <Ionicons name="camera-outline" size={36} color={RIDES_ACCENT} />
                <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '600' }}>
                  Araç fotoğrafı ekle
                </Text>
                <Text variant="caption" secondary>
                  Yolcular aracınızı görecek
                </Text>
              </Pressable>
            )}

            {photoUris.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                  {photoUris.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                      <Pressable onPress={() => setPreviewIndex(index)}>
                        <Image
                          source={{ uri }}
                          style={[styles.thumb, previewIndex === index && styles.thumbActive]}
                        />
                      </Pressable>
                      {index === 0 ? (
                        <View style={styles.coverTag}>
                          <Text style={styles.coverTagText}>Kapak</Text>
                        </View>
                      ) : null}
                      <Pressable style={styles.removeBtn} onPress={() => removePhoto(index)} hitSlop={6}>
                        <Ionicons name="close-circle" size={20} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                  {photoUris.length < RIDE_MAX_PHOTOS ? (
                    <Pressable onPress={pickPhotos} style={styles.addThumb}>
                      <Ionicons name="add" size={28} color={RIDES_ACCENT} />
                    </Pressable>
                  ) : null}
                </ScrollView>
                <Text variant="caption" secondary>
                  {photoUris.length}/{RIDE_MAX_PHOTOS} fotoğraf · İlk fotoğraf kapak olarak kullanılır
                </Text>
              </>
            ) : null}

            {!previewUri ? (
              <Button title="Galeriden seç" variant="outline" onPress={pickPhotos} style={{ marginTop: spacing.sm }} />
            ) : null}
          </ListingFormSection>
        ) : null}

        <ListingFormSection step={showVehiclePhotos ? 2 : 1} title="Araç bilgileri">
          <Input label="Marka" value={brand} onChangeText={setBrand} placeholder="Toyota" />
          <Input label="Model" value={model} onChangeText={setModel} placeholder="Corolla" />
          <Input label="Yıl" value={year} onChangeText={setYear} keyboardType="number-pad" />
          <Input label="Plaka" value={plate} onChangeText={setPlate} placeholder="61 ABC 123" autoCapitalize="characters" />
          <Input label="Renk" value={color} onChangeText={setColor} />
          {VEHICLE_TYPE_OPTIONS.map((o) => (
            <Pressable key={o.id} onPress={() => setVehicleType(o.id)} style={styles.row}>
              <Ionicons name={vehicleType === o.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={RIDES_ACCENT} />
              <Text variant="caption">{o.label} (max {o.maxSeats} koltuk)</Text>
            </Pressable>
          ))}
        </ListingFormSection>

        <Button title={isEdit ? 'Güncelle' : 'Kaydet'} loading={saving} onPress={handleSubmit} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  heroWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  hero: { width: '100%', height: 200, backgroundColor: '#ddd' },
  heroBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  heroBadgeText: { color: '#fff', fontWeight: '700' },
  heroEmpty: {
    height: 180,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: `${RIDES_ACCENT}66`,
    backgroundColor: `${RIDES_ACCENT}0A`,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  thumbRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: RIDES_ACCENT },
  coverTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: RIDES_ACCENT,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  coverTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  addThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: `${RIDES_ACCENT}88`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
