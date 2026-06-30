import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  LOST_CATEGORY_OPTIONS,
  LOST_CENTER_DEF,
  lostCategoryIcon,
  lostCategoryLabel,
} from '@/features/lost-found/constants';
import {
  createLostItem,
  fetchLostItemForEdit,
  updateLostItem,
} from '@/features/lost-found/services/lostItemData';
import { lostGoBack } from '@/features/lost-found/services/lostNavigation';
import { uploadLostItemImages } from '@/features/lost-found/services/mediaUpload';
import type { LostItemCategory, LostItemType } from '@/features/lost-found/types';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const ACCENT = LOST_CENTER_DEF.accent;

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
        <LinearGradient colors={[`${ACCENT}44`, `${ACCENT}22`]} style={styles.stepBadge}>
          <Text variant="caption" style={{ color: ACCENT, fontWeight: '800' }}>
            {step}
          </Text>
        </LinearGradient>
        <View style={styles.sectionTitles}>
          <Text variant="label">{title}</Text>
          {subtitle ? (
            <Text secondary variant="caption">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function LivePreviewCard({
  itemType,
  category,
  title,
  description,
  locationName,
  district,
  rewardAmount,
  isUrgent,
  photoUris,
}: {
  itemType: LostItemType;
  category: LostItemCategory;
  title: string;
  description: string;
  locationName: string;
  district: string;
  rewardAmount: string;
  isUrgent: boolean;
  photoUris: string[];
}) {
  const { colors } = useTheme();
  const categoryColor = LOST_CATEGORY_OPTIONS.find((o) => o.value === category);
  const icon = lostCategoryIcon(category) as keyof typeof Ionicons.glyphMap;
  const typeColor = itemType === 'lost' ? colors.danger : colors.success;

  return (
    <View style={[styles.previewCard, { borderColor: `${ACCENT}33` }]}>
      <Text variant="caption" style={[styles.previewLabel, { color: ACCENT }]}>
        Canlı önizleme
      </Text>

      <View style={styles.previewCoverWrap}>
        {photoUris[0] ? (
          <Image source={{ uri: photoUris[0] }} style={styles.previewCover} />
        ) : (
          <LinearGradient
            colors={[`${ACCENT}44`, `${ACCENT}18`]}
            style={styles.previewCoverPlaceholder}
          >
            <Ionicons name={icon} size={36} color={ACCENT} />
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.previewFade} />
        <View style={styles.previewBadges}>
          <View style={[styles.previewTypeBadge, { backgroundColor: `${typeColor}DD` }]}>
            <Text variant="caption" style={styles.previewBadgeText}>
              {itemType === 'lost' ? 'Kayıp' : 'Buluntu'}
            </Text>
          </View>
          {isUrgent ? (
            <View style={[styles.previewTypeBadge, { backgroundColor: colors.danger }]}>
              <Ionicons name="flash" size={10} color="#fff" />
              <Text variant="caption" style={styles.previewBadgeText}>
                Acil
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.previewBottom}>
          <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
            {title.trim() || 'İlan başlığınız'}
          </Text>
          <Text variant="caption" style={styles.previewCategory}>
            {categoryColor?.label ?? lostCategoryLabel(category)}
          </Text>
        </View>
      </View>

      {description.trim() ? (
        <Text secondary variant="caption" numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      {(locationName.trim() || district) ? (
        <View style={styles.previewMetaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text secondary variant="caption" numberOfLines={1}>
            {[locationName, district].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      {itemType === 'lost' && rewardAmount.trim() ? (
        <View style={[styles.previewReward, { backgroundColor: `${colors.warning}16` }]}>
          <Ionicons name="gift-outline" size={13} color={colors.warning} />
          <Text variant="caption" style={{ color: colors.warning, fontWeight: '700' }}>
            Ödül: {rewardAmount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function CreateLostItemScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{ type?: string; id?: string | string[] }>();
  const typeParam = params.type;
  const itemId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEdit = Boolean(itemId);

  const [itemType, setItemType] = useState<LostItemType>(typeParam === 'found' ? 'found' : 'lost');
  const [category, setCategory] = useState<LostItemCategory>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [locationName, setLocationName] = useState('');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [rewardAmount, setRewardAmount] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingItem, setLoadingItem] = useState(isEdit);

  const regionId = profile?.region_id ?? 'trabzon';
  const districts = DISTRICTS[regionId as RegionId] ?? [];
  const allPreviewUris = [...existingMediaUrls, ...photoUris];

  const completionScore = useMemo(() => {
    let score = 0;
    if (title.trim()) score += 25;
    if (description.trim()) score += 25;
    if (contactInfo.trim()) score += 15;
    if (locationName.trim() || district) score += 15;
    if (allPreviewUris.length > 0) score += 20;
    return score;
  }, [title, description, contactInfo, locationName, district, allPreviewUris.length]);

  useEffect(() => {
    if (!isEdit) {
      if (typeParam === 'found') setItemType('found');
      if (typeParam === 'lost') setItemType('lost');
    }
  }, [typeParam, isEdit]);

  useEffect(() => {
    if (!isEdit || !itemId || !user?.id) return;

    setLoadingItem(true);
    fetchLostItemForEdit(itemId, user.id).then((record) => {
      setLoadingItem(false);
      if (!record) {
        Alert.alert('Düzenlenemez', 'İlan bulunamadı veya yetkiniz yok.', [
          { text: 'Tamam', onPress: lostGoBack },
        ]);
        return;
      }

      setItemType(record.itemType);
      setCategory(record.category);
      setTitle(record.title);
      setDescription(record.description);
      setContactInfo(record.contactInfo ?? '');
      setLocationName(record.locationName ?? '');
      setDistrict(record.district ?? '');
      setRewardAmount(record.rewardAmount ?? '');
      setIsUrgent(record.isUrgent);
      setExistingMediaUrls(record.mediaUrls);
      setPhotoUris([]);
    });
  }, [isEdit, itemId, user?.id]);

  const pickPhotos = async () => {
    const remaining = 4 - existingMediaUrls.length - photoUris.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, remaining));
    }
  };

  const removePhoto = (uri: string) => {
    if (existingMediaUrls.includes(uri)) {
      setExistingMediaUrls((prev) => prev.filter((u) => u !== uri));
    } else {
      setPhotoUris((prev) => prev.filter((u) => u !== uri));
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve açıklama zorunludur.');
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (!isEdit) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    }

    setSaving(true);
    const uploadedUrls = photoUris.length > 0 ? await uploadLostItemImages(user.id, photoUris) : [];
    const mediaUrls = [...existingMediaUrls, ...uploadedUrls].slice(0, 4);

    if (isEdit && itemId) {
      const result = await updateLostItem({
        itemId,
        authorId: user.id,
        regionId,
        itemType,
        category,
        title: title.trim(),
        description: description.trim(),
        contactInfo: contactInfo.trim() || null,
        locationName: locationName.trim() || null,
        district: district || null,
        mediaUrls,
        isUrgent,
        rewardAmount: rewardAmount.trim() || null,
        lastSeenAt: new Date().toISOString(),
      });
      setSaving(false);

      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }

      Alert.alert('Güncellendi', 'İlan bilgileri kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/detail/lost-found/${itemId}` as never) },
      ]);
      return;
    }

    const result = await createLostItem({
      authorId: user.id,
      regionId,
      itemType,
      category,
      title: title.trim(),
      description: description.trim(),
      contactInfo: contactInfo.trim() || null,
      locationName: locationName.trim() || null,
      district: district || null,
      mediaUrls,
      isUrgent,
      rewardAmount: rewardAmount.trim() || null,
      lastSeenAt: new Date().toISOString(),
      latitude,
      longitude,
    });
    setSaving(false);

    if (result.error || !result.id) {
      Alert.alert('Hata', result.error ?? 'İlan oluşturulamadı.');
      return;
    }

    Alert.alert('İlan yayınlandı', 'İlanınız haritada ve akışta görünecek.', [
      { text: 'Tamam', onPress: () => router.replace(`/detail/lost-found/${result.id}` as never) },
    ]);
  };

  if (loadingItem) {
    return (
      <GradientBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={48}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={lostGoBack} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.topBarText}>
            <Text variant="label">
              {isEdit ? 'İlanı Düzenle' : itemType === 'lost' ? 'Kayıp İlanı Ver' : 'Buluntu Bildir'}
            </Text>
            <Text secondary variant="caption">
              {isEdit ? 'Bilgileri güncelleyin' : 'Detaylı bilgi paylaşın, topluluk yardımcı olsun'}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={
            isDark
              ? ([`${ACCENT}33`, `${ACCENT}12`, 'transparent'] as const)
              : ([`${ACCENT}28`, `${ACCENT}10`, 'transparent'] as const)
          }
          style={styles.heroStrip}
        >
          <View style={styles.heroRow}>
            <Ionicons name="sparkles" size={18} color={ACCENT} />
            <Text variant="caption" style={{ color: ACCENT, fontWeight: '700', flex: 1 }}>
              %{completionScore} tamamlandı
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: `${ACCENT}22` }]}>
            <View style={[styles.progressFill, { width: `${completionScore}%`, backgroundColor: ACCENT }]} />
          </View>
        </LinearGradient>

        {!isEdit ? (
          <View style={styles.typeRow}>
          {(['lost', 'found'] as const).map((type) => {
            const selected = itemType === type;
            const tone = type === 'lost' ? colors.danger : colors.success;
            return (
              <Pressable
                key={type}
                onPress={() => setItemType(type)}
                style={[
                  styles.typeCard,
                  {
                    borderColor: selected ? tone : colors.border,
                    backgroundColor: selected ? `${tone}12` : colors.surfaceElevated,
                  },
                ]}
              >
                <Ionicons
                  name={type === 'lost' ? 'help-circle' : 'checkmark-circle'}
                  size={24}
                  color={selected ? tone : colors.textMuted}
                />
                <Text variant="label" style={{ color: selected ? tone : colors.text }}>
                  {type === 'lost' ? 'Kayıp' : 'Buluntu'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        ) : null}

        <LivePreviewCard
          itemType={itemType}
          category={category}
          title={title}
          description={description}
          locationName={locationName}
          district={district}
          rewardAmount={rewardAmount}
          isUrgent={isUrgent}
          photoUris={allPreviewUris}
        />

        <FormSection step={1} title="Fotoğraflar" subtitle="En fazla 4 görsel">
          <Pressable onPress={pickPhotos} style={[styles.photoPicker, { borderColor: colors.border }]}>
            <View style={[styles.photoIcon, { backgroundColor: `${ACCENT}18` }]}>
              <Ionicons name="camera" size={24} color={ACCENT} />
            </View>
            <Text variant="label">Fotoğraf ekle</Text>
            <Text secondary variant="caption">
              {allPreviewUris.length}/4 görsel
            </Text>
          </Pressable>
          {allPreviewUris.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {allPreviewUris.map((uri) => (
                <View key={uri} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <Pressable onPress={() => removePhoto(uri)} style={styles.photoRemove}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </FormSection>

        <FormSection step={2} title="İlan bilgileri" subtitle="Başlık ve açıklama">
          <Input
            label="Başlık"
            value={title}
            onChangeText={setTitle}
            placeholder={itemType === 'lost' ? 'Örn: Kayıp kedi — Pamuk' : 'Örn: Bulunan cüzdan'}
          />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            placeholder="Son görüldüğü yer, ayırt edici özellikler..."
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
        </FormSection>

        <FormSection step={3} title="Kategori" subtitle="İlan türünü seçin">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {LOST_CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.value;
              const icon = option.icon as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory(option.value)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: selected ? ACCENT : colors.border,
                      backgroundColor: selected ? `${ACCENT}14` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: selected ? `${ACCENT}22` : `${colors.textMuted}14` }]}>
                    <Ionicons name={icon} size={20} color={selected ? ACCENT : colors.textMuted} />
                  </View>
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? ACCENT : colors.textSecondary,
                      fontWeight: selected ? '700' : '400',
                      textAlign: 'center',
                    }}
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FormSection>

        <FormSection step={4} title="Konum & İletişim" subtitle="Ulaşım bilgileri">
          <Input label="İletişim" value={contactInfo} onChangeText={setContactInfo} placeholder="Telefon veya mesaj" />
          <Input label="Konum adı" value={locationName} onChangeText={setLocationName} placeholder="Mahalle / cadde" />
          {districts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtScroll}>
              {districts.map((d) => {
                const selected = district === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDistrict(d)}
                    style={[
                      styles.districtChip,
                      {
                        borderColor: selected ? ACCENT : colors.border,
                        backgroundColor: selected ? `${ACCENT}14` : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text variant="caption" style={{ color: selected ? ACCENT : colors.textSecondary, fontWeight: selected ? '700' : '400' }}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Input label="İlçe" value={district} onChangeText={setDistrict} />
          )}
        </FormSection>

        <FormSection step={5} title="Ek seçenekler">
          {itemType === 'lost' ? (
            <Input
              label="Ödül (opsiyonel)"
              value={rewardAmount}
              onChangeText={setRewardAmount}
              placeholder="Örn: 5000 TL"
            />
          ) : null}

          <View style={[styles.urgentRow, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}33` }]}>
            <View style={styles.urgentCopy}>
              <Ionicons name="flash" size={18} color={colors.danger} />
              <View style={styles.flex}>
                <Text variant="label">Acil ilan</Text>
                <Text secondary variant="caption">
                  Öncelikli gösterim ve bildirim
                </Text>
              </View>
            </View>
            <Switch
              value={isUrgent}
              onValueChange={setIsUrgent}
              trackColor={{ true: colors.danger }}
            />
          </View>
        </FormSection>
      </KeyboardAwareScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            paddingBottom: insets.bottom + spacing.sm,
            borderTopColor: colors.border,
            backgroundColor: `${colors.surface}F5`,
          },
        ]}
      >
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={saving}
          style={({ pressed }) => [
            styles.publishBtn,
            { backgroundColor: ACCENT, opacity: saving || pressed ? 0.88 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={isEdit ? 'save' : 'megaphone'} size={20} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                {isEdit ? 'Değişiklikleri Kaydet' : 'İlanı Yayınla'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: {
    flex: 1,
    gap: 2,
  },
  heroStrip: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  previewCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewLabel: {
    fontWeight: '700',
  },
  previewCoverWrap: {
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  previewCover: {
    width: '100%',
    height: '100%',
  },
  previewCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFade: {
    ...StyleSheet.absoluteFillObject,
  },
  previewBadges: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  previewBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
  },
  previewBottom: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    gap: 2,
  },
  previewTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  previewCategory: {
    color: 'rgba(255,255,255,0.9)',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  section: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitles: {
    flex: 1,
    gap: 2,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  photoPicker: {
    borderWidth: 1,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRow: {
    gap: spacing.sm,
  },
  photoThumbWrap: {
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  categoryChip: {
    width: 88,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  districtChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  urgentCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
