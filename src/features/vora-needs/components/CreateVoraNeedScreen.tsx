import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  VORA_NEED_CATEGORY_OPTIONS,
  VORA_NEED_MAX_DESCRIPTION_LENGTH,
  VORA_NEED_MAX_TITLE_LENGTH,
  VORA_NEED_MIN_DESCRIPTION_LENGTH,
  VORA_NEED_MIN_TITLE_LENGTH,
  VORA_NEED_VISIBILITY_OPTIONS,
  VORA_NEEDS_ACCENT,
  voraNeedDetailPath,
} from '@/features/vora-needs/constants';
import { createVoraNeed } from '@/features/vora-needs/services/needData';
import { resolveVoraNeedLocation } from '@/features/vora-needs/services/needLocation';
import { uploadVoraNeedImage } from '@/features/vora-needs/services/mediaUpload';
import type { VoraNeedCategory, VoraNeedVisibility } from '@/features/vora-needs/types';
import { regionNameById } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CreateVoraNeedScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VoraNeedCategory>('product');
  const [visibility, setVisibility] = useState<VoraNeedVisibility>('city');
  const [isUrgent, setIsUrgent] = useState(false);
  const [city, setCity] = useState(regionNameById(profile?.region_id ?? 'trabzon') ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const regionId = profile?.region_id ?? 'trabzon';

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const titleCount = trimmedTitle.length;
  const descriptionCount = trimmedDescription.length;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (titleCount < VORA_NEED_MIN_TITLE_LENGTH || titleCount > VORA_NEED_MAX_TITLE_LENGTH) {
      Alert.alert(
        'Eksik başlık',
        `Başlık ${VORA_NEED_MIN_TITLE_LENGTH}–${VORA_NEED_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`,
      );
      return;
    }
    if (
      descriptionCount < VORA_NEED_MIN_DESCRIPTION_LENGTH ||
      descriptionCount > VORA_NEED_MAX_DESCRIPTION_LENGTH
    ) {
      Alert.alert(
        'Eksik açıklama',
        `Açıklama en az ${VORA_NEED_MIN_DESCRIPTION_LENGTH} karakter olmalıdır.`,
      );
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;

    const location = await resolveVoraNeedLocation(visibility, regionId as RegionId);
    if (location.error) {
      Alert.alert('Konum gerekli', location.error);
      return;
    }
    latitude = location.latitude;
    longitude = location.longitude;

    setSaving(true);
    let imageUrl: string | null = null;
    if (photoUri) {
      const upload = await uploadVoraNeedImage(user.id, photoUri);
      imageUrl = upload.url;
    }

    const result = await createVoraNeed({
      authorId: user.id,
      regionId: visibility === 'global' ? regionId : regionId,
      city: visibility === 'global' ? null : city.trim() || regionNameById(regionId) || null,
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      visibility,
      urgency: isUrgent ? 'urgent' : 'normal',
      imageUrl,
      latitude,
      longitude,
    });
    setSaving(false);

    if (result.error || !result.id) {
      Alert.alert('Hata', result.error ?? 'İlan oluşturulamadı.');
      return;
    }

    Alert.alert('İlan yayınlandı', 'İhtiyacınız akışta ve haritada görünecek.', [
      { text: 'Tamam', onPress: () => router.replace(voraNeedDetailPath(result.id!) as never) },
    ]);
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={88}
      >
        <AuthHeader
          title="İhtiyaç Paylaş"
          subtitle="Global veya yerel — ihtiyacınızı toplulukla paylaşın"
        />

        <GlassCard style={styles.form}>
          <Text variant="label">Kategori</Text>
          <View style={styles.chipGrid}>
            {VORA_NEED_CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory(option.value)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? option.color : colors.border,
                      backgroundColor: selected ? `${option.color}16` : colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={selected ? option.color : colors.textMuted}
                  />
                  <Text variant="caption" style={{ color: selected ? option.color : colors.text, fontWeight: '600' }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input label="Başlık" value={title} onChangeText={setTitle} placeholder="Örn: Laptop lazım" />
          <Text
            variant="caption"
            style={{
              alignSelf: 'flex-end',
              color:
                titleCount > 0 && titleCount < VORA_NEED_MIN_TITLE_LENGTH
                  ? colors.danger
                  : colors.textMuted,
            }}
          >
            {titleCount}/{VORA_NEED_MAX_TITLE_LENGTH}
          </Text>
          <Input
            label="Açıklama"
            value={description}
            onChangeText={(text) => setDescription(text.slice(0, VORA_NEED_MAX_DESCRIPTION_LENGTH))}
            placeholder="Detaylı açıklama yazın..."
            multiline
            numberOfLines={5}
            style={styles.textarea}
          />
          <Text
            variant="caption"
            style={{
              alignSelf: 'flex-end',
              color:
                descriptionCount > 0 && descriptionCount < VORA_NEED_MIN_DESCRIPTION_LENGTH
                  ? colors.danger
                  : colors.textMuted,
            }}
          >
            {descriptionCount}/{VORA_NEED_MAX_DESCRIPTION_LENGTH}
          </Text>
          {descriptionCount > 0 && descriptionCount < VORA_NEED_MIN_DESCRIPTION_LENGTH ? (
            <Text variant="caption" style={{ color: colors.danger }}>
              En az {VORA_NEED_MIN_DESCRIPTION_LENGTH} karakter yazın.
            </Text>
          ) : null}

          <Text variant="label">Görünürlük</Text>
          <View style={styles.visibilityList}>
            {VORA_NEED_VISIBILITY_OPTIONS.map((option) => {
              const selected = visibility === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setVisibility(option.value)}
                  style={[
                    styles.visibilityCard,
                    {
                      borderColor: selected ? VORA_NEEDS_ACCENT : colors.border,
                      backgroundColor: selected ? `${VORA_NEEDS_ACCENT}10` : colors.surface,
                    },
                  ]}
                >
                  <View style={[styles.visibilityIcon, { backgroundColor: `${VORA_NEEDS_ACCENT}18` }]}>
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={selected ? VORA_NEEDS_ACCENT : colors.textMuted}
                    />
                  </View>
                  <View style={styles.visibilityCopy}>
                    <Text variant="label">{option.label}</Text>
                    <Text secondary variant="caption">
                      {option.description}
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={VORA_NEEDS_ACCENT} /> : null}
                </Pressable>
              );
            })}
          </View>

          {visibility !== 'global' ? (
            <View style={[styles.globalNote, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="business-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, flex: 1 }}>
                Bölge: {regionNameById(regionId) ?? regionId}
              </Text>
            </View>
          ) : (
            <View style={[styles.globalNote, { backgroundColor: `${colors.primary}12` }]}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, flex: 1 }}>
                Bu ilan tüm platformda görünür. Haritada bölge merkezinizde veya GPS konumunuzda gösterilir.
              </Text>
            </View>
          )}

          {visibility === 'city' ? (
            <>
              <Input label="Şehir adı (opsiyonel)" value={city} onChangeText={setCity} placeholder="Örn: Ankara" />
              <View style={[styles.globalNote, { backgroundColor: `${colors.accent}12` }]}>
                <Ionicons name="map-outline" size={18} color={colors.accent} />
                <Text variant="caption" style={{ color: colors.accent, flex: 1 }}>
                  Şehir ilanları haritada konumunuz veya bölge merkezinde görünür.
                </Text>
              </View>
            </>
          ) : null}

          {visibility === 'nearby' ? (
            <View style={[styles.globalNote, { backgroundColor: `${colors.warning}12` }]}>
              <Ionicons name="navigate-outline" size={18} color={colors.warning} />
              <Text variant="caption" style={{ color: colors.warning, flex: 1 }}>
                Yakınlık ilanı — 5–10 km çevresindeki kullanıcılar görür. Konumunuz kaydedilir.
              </Text>
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text variant="label">Acil ilan</Text>
              <Text secondary variant="caption">
                Acil ihtiyaçlar öne çıkar
              </Text>
            </View>
            <Switch value={isUrgent} onValueChange={setIsUrgent} />
          </View>

          <Pressable onPress={pickPhoto} style={[styles.photoPicker, { borderColor: colors.border }]}>
            <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
            <Text secondary variant="caption">
              {photoUri ? 'Görseli değiştir' : 'Görsel ekle (opsiyonel)'}
            </Text>
          </Pressable>

          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoThumb} /> : null}

          <Button title="Yayınla" loading={saving} onPress={handleSubmit} />
        </GlassCard>
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  visibilityList: {
    gap: spacing.sm,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityCopy: {
    flex: 1,
    gap: 2,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
  photoPicker: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  photoThumb: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  globalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
});
