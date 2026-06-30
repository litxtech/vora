import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { AiRequestAssistPanel } from '@/features/vora-hizmetler/components/AiRequestAssistPanel';
import { HizmetChipPicker } from '@/features/vora-hizmetler/components/HizmetChipPicker';
import { HizmetFormStep, HizmetHeroBanner } from '@/features/vora-hizmetler/components/HizmetUi';
import {
  SERVICE_CATEGORY_OPTIONS,
  SERVICE_MAX_DESCRIPTION_LENGTH,
  SERVICE_MAX_TITLE_LENGTH,
  SERVICE_MIN_DESCRIPTION_LENGTH,
  SERVICE_MIN_TITLE_LENGTH,
  SERVICE_URGENCY_OPTIONS,
  serviceRequestDetailPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import { analyzeServiceRequest, uploadServiceMedia } from '@/features/vora-hizmetler/services/aiAssist';
import { resolveServiceLocation } from '@/features/vora-hizmetler/services/location';
import { createServiceRequest, fetchServiceRequestById, updateServiceRequest } from '@/features/vora-hizmetler/services/requestData';
import type { AiRequestAssistResult, ServiceCategory, ServiceUrgency } from '@/features/vora-hizmetler/types';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { regionNameById } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CreateServiceRequestScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{ category?: string; requestId?: string }>();
  const showAi = useFeatureVisible(VORA_HIZMETLER_FEATURE.section.ai);
  const requestId = typeof params.requestId === 'string' ? params.requestId : null;
  const isEdit = !!requestId;

  const initialCategory =
    typeof params.category === 'string' ? (params.category as ServiceCategory) : 'diger';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ServiceCategory>(initialCategory);
  const [urgency, setUrgency] = useState<ServiceUrgency>('today');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [city, setCity] = useState(regionNameById(profile?.region_id ?? 'trabzon') ?? '');
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiRequestAssistResult | null>(null);

  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const totalMediaCount = existingImageUrls.length + mediaUris.length;

  useEffect(() => {
    if (!isEdit || !requestId || !user?.id) return;

    let cancelled = false;
    void (async () => {
      setLoadingExisting(true);
      const result = await fetchServiceRequestById(requestId);
      if (cancelled) return;

      const listing = result.listing;
      if (!listing || listing.requesterId !== user.id) {
        Alert.alert('Erişim yok', 'Bu ilanı düzenleyemezsiniz.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        setLoadingExisting(false);
        return;
      }
      if (listing.status !== 'pending_offers') {
        Alert.alert('Düzenlenemez', 'Kabul edilmiş veya tamamlanmış ilanlar düzenlenemez.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        setLoadingExisting(false);
        return;
      }

      setTitle(listing.title);
      setDescription(listing.description);
      setCategory(listing.category);
      setUrgency(listing.urgency);
      setBudgetMin(listing.budgetMin != null ? String(listing.budgetMin) : '');
      setBudgetMax(listing.budgetMax != null ? String(listing.budgetMax) : '');
      setCity(listing.city ?? regionNameById(profile?.region_id ?? 'trabzon') ?? '');
      setExistingImageUrls(listing.imageUrls ?? []);
      setLoadingExisting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, requestId, user?.id, profile?.region_id]);

  const runAiAssist = useCallback(
    async (text: string) => {
      if (!showAi || text.trim().length < 8) {
        setAiResult(null);
        return;
      }
      setAiLoading(true);
      const result = await analyzeServiceRequest(text, regionId);
      setAiResult(result);
      setCategory(result.category);
      setAiLoading(false);
    },
    [showAi, regionId],
  );

  useEffect(() => {
    const timer = setTimeout(() => runAiAssist(description), 600);
    return () => clearTimeout(timer);
  }, [description, runAiAssist]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5 - totalMediaCount,
    });
    if (!result.canceled) {
      setMediaUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5 - existingImageUrls.length));
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < SERVICE_MIN_TITLE_LENGTH || trimmedTitle.length > SERVICE_MAX_TITLE_LENGTH) {
      Alert.alert('Eksik başlık', `Başlık ${SERVICE_MIN_TITLE_LENGTH}–${SERVICE_MAX_TITLE_LENGTH} karakter olmalıdır.`);
      return;
    }
    if (trimmedDescription.length < SERVICE_MIN_DESCRIPTION_LENGTH) {
      Alert.alert('Eksik açıklama', `Açıklama en az ${SERVICE_MIN_DESCRIPTION_LENGTH} karakter olmalıdır.`);
      return;
    }

    setSaving(true);
    const imageUrls: string[] = [...existingImageUrls];
    for (const uri of mediaUris) {
      const upload = await uploadServiceMedia(user.id, uri);
      if (upload.url) imageUrls.push(upload.url);
    }

    if (isEdit && requestId) {
      const result = await updateServiceRequest({
        requestId,
        requesterId: user.id,
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        urgency,
        city: city.trim() || null,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        imageUrls,
      });
      setSaving(false);

      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }

      Alert.alert('İlan güncellendi', 'Değişiklikler kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(serviceRequestDetailPath(requestId) as never) },
      ]);
      return;
    }

    const location = await resolveServiceLocation(regionId);
    if (location.error) {
      setSaving(false);
      Alert.alert('Konum gerekli', location.error);
      return;
    }

    const result = await createServiceRequest({
      requesterId: user.id,
      regionId,
      city: city.trim() || location.city,
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      urgency,
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: budgetMax ? Number(budgetMax) : null,
      imageUrls,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setSaving(false);

    if (result.error || !result.id) {
      Alert.alert('Hata', result.error ?? 'Talep oluşturulamadı.');
      return;
    }

    Alert.alert('Talep yayınlandı', 'İlgili ustalara bildirim gönderildi.', [
      { text: 'Tamam', onPress: () => router.replace(serviceRequestDetailPath(result.id!) as never) },
    ]);
  };

  if (loadingExisting) {
    return (
      <GradientBackground>
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loading} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
        showsVerticalScrollIndicator={false}
      >
        <ScreenBackButton />

        <HizmetHeroBanner
          title={isEdit ? 'İlanı Düzenle' : 'Usta Talebi Oluştur'}
          subtitle={
            isEdit
              ? 'Teklif gelmeden önce başlık, açıklama ve bütçeyi güncelleyebilirsiniz.'
              : 'İhtiyacınızı detaylı anlatın, ustalardan teklif alın. Ödeme anlaşma sonrası güvenle yapılır.'
          }
          icon="document-text-outline"
        />

        {showAi && (aiLoading || aiResult) ? (
          <AiRequestAssistPanel result={aiResult} loading={aiLoading} />
        ) : null}

        <HizmetFormStep step={1} title="Talep Özeti" subtitle="Başlık ve açıklama">
          <Input
            label="Başlık"
            placeholder="Elektrikçi Arıyorum"
            value={title}
            onChangeText={setTitle}
            maxLength={SERVICE_MAX_TITLE_LENGTH}
          />
          <Input
            label="Açıklama"
            placeholder="Evimde musluk damlatıyor…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={SERVICE_MAX_DESCRIPTION_LENGTH}
            style={styles.textArea}
          />
          <Text secondary variant="caption" style={styles.counter}>
            {description.trim().length}/{SERVICE_MAX_DESCRIPTION_LENGTH}
          </Text>
        </HizmetFormStep>

        <HizmetFormStep step={2} title="Kategori & Aciliyet">
          <HizmetChipPicker
            label="Kategori"
            options={SERVICE_CATEGORY_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              icon: o.icon,
              color: o.color,
            }))}
            value={category}
            onChange={setCategory}
          />
          <HizmetChipPicker
            label="Aciliyet"
            options={SERVICE_URGENCY_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              icon: o.icon,
            }))}
            value={urgency}
            onChange={setUrgency}
            scrollable={false}
          />
        </HizmetFormStep>

        <HizmetFormStep step={3} title="Konum & Bütçe">
          <Input label="Konum / Şehir" value={city} onChangeText={setCity} placeholder="Trabzon" />
          <View style={styles.budgetRow}>
            <View style={styles.budgetField}>
              <Input label="Min Bütçe (TL)" value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" placeholder="500" />
            </View>
            <View style={styles.budgetField}>
              <Input label="Max Bütçe (TL)" value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="2000" />
            </View>
          </View>
        </HizmetFormStep>

        <HizmetFormStep step={4} title="Fotoğraf / Video" subtitle="En fazla 5 medya">
          <View style={styles.mediaRow}>
            {existingImageUrls.map((uri) => (
              <View key={uri} style={styles.mediaThumbWrap}>
                <Image source={{ uri }} style={styles.mediaThumb} />
                <Pressable
                  onPress={() => setExistingImageUrls((prev) => prev.filter((item) => item !== uri))}
                  style={styles.mediaRemove}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {mediaUris.map((uri, i) => (
              <View key={uri} style={styles.mediaThumbWrap}>
                <Image source={{ uri }} style={styles.mediaThumb} />
                <Pressable
                  onPress={() => setMediaUris((prev) => prev.filter((_, idx) => idx !== i))}
                  style={styles.mediaRemove}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {totalMediaCount < 5 ? (
              <Pressable onPress={pickMedia} style={[styles.mediaAdd, { borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={24} color={VORA_HIZMETLER_ACCENT} />
                <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '600' }}>
                  Ekle
                </Text>
              </Pressable>
            ) : null}
          </View>
        </HizmetFormStep>

        <Button
          title={isEdit ? 'Değişiklikleri Kaydet' : 'Talebi Yayınla'}
          onPress={handleSubmit}
          loading={saving}
          style={styles.submit}
        />
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  loading: {
    marginTop: 120,
    alignSelf: 'center',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counter: {
    textAlign: 'right',
    marginTop: -spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  budgetField: {
    flex: 1,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mediaThumbWrap: {
    position: 'relative',
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAdd: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  submit: {
    marginTop: spacing.xs,
  },
});
