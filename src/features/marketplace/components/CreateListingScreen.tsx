import { useEffect, useMemo, useState } from 'react';
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
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { ListingSheetPicker } from '@/features/marketplace/components/ListingSheetPicker';
import {
  CATEGORY_DEFS,
  CONDITION_OPTIONS,
  containsBlockedFoodKeyword,
  DELIVERY_MODE_OPTIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_MAX_DESCRIPTION_LENGTH,
  MARKETPLACE_MAX_PHOTOS,
  MARKETPLACE_MAX_TITLE_LENGTH,
  MARKETPLACE_MIN_DESCRIPTION_LENGTH,
  MARKETPLACE_MIN_TITLE_LENGTH,
  MARKETPLACE_ERROR_DUPLICATE,
  MARKETPLACE_MAX_DAILY_LISTINGS,
  MARKETPLACE_ACCENT,
  MARKETPLACE_GRADIENT,
  categoryLabel,
  formatMarketplacePrice,
  subcategoryLabel,
} from '@/features/marketplace/constants';
import { ListingFormSection } from '@/features/marketplace/components/ListingFormSection';
import { MARKETPLACE_FEATURE } from '@/features/marketplace/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MarketplaceModernPriceInput } from '@/features/marketplace/components/MarketplaceModernPriceInput';
import { MarketplaceRichEditor } from '@/features/marketplace/components/MarketplaceRichEditor';
import { descriptionPlainText } from '@/features/marketplace/services/descriptionBlocks';
import {
  createMarketplaceListing,
  fetchMarketplaceListing,
  setOwnerListingStatus,
  updateMarketplaceListing,
} from '@/features/marketplace/services/listingData';
import { uploadMarketplaceDescriptionMedia, uploadMarketplaceImages } from '@/features/marketplace/services/mediaUpload';
import type {
  MarketplaceCategory,
  MarketplaceCondition,
  MarketplaceDeliveryMode,
  MarketplaceDescriptionBlock,
  MarketplaceListing,
  MarketplaceListingType,
} from '@/features/marketplace/types';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import {
  BUSINESS_GRADIENT,
  BUSINESS_ROUTES,
  shopAccentColor,
} from '@/features/business-center/constants';
import { appendBusinessShopShowcaseItem } from '@/features/business-center/services/businessShopShowcase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type BusinessListingMeta = {
  id: string;
  name: string;
  shopAccent: string | null;
  shopTagline?: string | null;
};

type Props = {
  editListingId?: string;
  cloneFromId?: string;
  businessId?: string;
  mode?: 'marketplace' | 'business';
  businessMeta?: BusinessListingMeta;
};

function hydrateDescription(listing: MarketplaceListing): {
  text: string;
  blocks: MarketplaceDescriptionBlock[];
} {
  const blocks = listing.descriptionBlocks ?? [];
  const textBlock = blocks.find((b) => b.type === 'text');
  return {
    text: textBlock?.type === 'text' ? textBlock.content : listing.description,
    blocks: blocks.filter((b) => b.type !== 'text'),
  };
}

function buildDescriptionPayload(text: string, blocks: MarketplaceDescriptionBlock[]): MarketplaceDescriptionBlock[] {
  const trimmed = text.trim();
  const payload: MarketplaceDescriptionBlock[] = [];
  if (trimmed) payload.push({ type: 'text', content: trimmed });
  return [...payload, ...blocks];
}

function LivePreviewCard({
  title,
  photoUris,
  category,
  subcategory,
  listingType,
  price,
  district,
  condition,
  accent,
}: {
  title: string;
  photoUris: string[];
  category: MarketplaceCategory;
  subcategory: string;
  listingType: MarketplaceListingType;
  price: string;
  district: string;
  condition: MarketplaceCondition;
  accent: string;
}) {
  const { colors } = useTheme();
  const catDef = CATEGORY_DEFS[category];
  const icon = catDef.icon as keyof typeof Ionicons.glyphMap;
  const priceNum = price.trim() ? Number(price.replace(',', '.')) : null;
  const priceLabel = formatMarketplacePrice(priceNum, listingType);
  const conditionLabel = CONDITION_OPTIONS.find((c) => c.value === condition)?.label ?? '';

  return (
    <View style={[styles.previewCard, { borderColor: `${accent}33` }]}>
      <Text variant="caption" style={[styles.previewLabel, { color: accent }]}>
        Canlı önizleme
      </Text>

      <View style={styles.previewCoverWrap}>
        {photoUris[0] ? (
          <Image source={{ uri: photoUris[0] }} style={styles.previewCover} />
        ) : (
          <LinearGradient colors={[`${catDef.color}55`, `${catDef.color}22`]} style={styles.previewCoverPlaceholder}>
            <Ionicons name={icon} size={36} color={catDef.color} />
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.previewFade} />
        <View style={styles.previewBottom}>
          <View style={[styles.previewChip, { backgroundColor: `${catDef.color}DD` }]}>
            <Ionicons name={icon} size={10} color="#fff" />
            <Text variant="caption" style={styles.previewChipText}>
              {categoryLabel(category)} · {subcategoryLabel(category, subcategory)}
            </Text>
          </View>
          <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
            {title.trim() || 'İlan başlığınız'}
          </Text>
          <Text variant="caption" style={styles.previewPrice}>
            {priceLabel}
          </Text>
        </View>
      </View>

      <View style={styles.previewMeta}>
        {district ? (
          <View style={styles.previewMetaRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text secondary variant="caption">
              {district}
            </Text>
          </View>
        ) : null}
        {conditionLabel ? (
          <View style={styles.previewMetaRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
            <Text secondary variant="caption">
              {conditionLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PhotoTile({
  uri,
  index,
  onRemove,
  onSetCover,
  accent,
}: {
  uri: string;
  index: number;
  onRemove: () => void;
  onSetCover: () => void;
  accent: string;
}) {
  const { colors } = useTheme();
  const isCover = index === 0;

  return (
    <View style={styles.photoTile}>
      <Pressable onPress={onSetCover} onLongPress={onRemove}>
        <Image source={{ uri }} style={styles.photo} />
        {isCover ? (
          <View style={[styles.coverBadge, { backgroundColor: accent }]}>
            <Text variant="caption" style={styles.coverBadgeText}>
              Kapak
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        style={[styles.photoRemove, { backgroundColor: colors.danger }]}
      >
        <Ionicons name="close" size={12} color="#fff" />
      </Pressable>
    </View>
  );
}

export function CreateListingScreen({
  editListingId,
  cloneFromId,
  businessId: businessIdProp,
  mode = 'marketplace',
  businessMeta,
}: Props) {
  const isBusinessFlow = mode === 'business' && !!businessMeta;
  const accent = isBusinessFlow ? shopAccentColor(businessMeta?.shopAccent) : MARKETPLACE_ACCENT;
  const accentGradient = isBusinessFlow ? BUSINESS_GRADIENT : MARKETPLACE_GRADIENT;
  const isEdit = !!editListingId;
  const isClone = !!cloneFromId && !isEdit;
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const showListingPhotos = useFeatureVisible(MARKETPLACE_FEATURE.listingPhotos) || isBusinessFlow;
  const regionId = resolveMarketplaceRegionId(profile?.region_id);
  const districts = DISTRICTS[regionId as RegionId] ?? [];

  const [category, setCategory] = useState<MarketplaceCategory>('other');
  const [subcategory, setSubcategory] = useState('other');
  const [listingType, setListingType] = useState<MarketplaceListingType>('sale');
  const [condition, setCondition] = useState<MarketplaceCondition>('used');
  const [deliveryMode, setDeliveryMode] = useState<MarketplaceDeliveryMode>('meetup');
  const [shippingNote, setShippingNote] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionBlocks, setDescriptionBlocks] = useState<MarketplaceDescriptionBlock[]>([]);
  const [price, setPrice] = useState('');
  const [district, setDistrict] = useState(profile?.district ?? districts[0] ?? '');
  const [tags, setTags] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingListing, setLoadingListing] = useState(isEdit || isClone);
  const [cloneMeta, setCloneMeta] = useState<{ sourceId: string; variantGroupId: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [linkedBusinessId, setLinkedBusinessId] = useState<string | null>(businessIdProp ?? null);

  useEffect(() => {
    if (businessIdProp) {
      setLinkedBusinessId(businessIdProp);
      return;
    }
    if (!user?.id || profile?.account_type !== 'business') return;
    void import('@/features/business-center/services/businessShopData').then(({ fetchBusinessAccountByOwner }) =>
      fetchBusinessAccountByOwner(user.id).then((biz) => {
        if (biz?.registrationStatus === 'approved') setLinkedBusinessId(biz.id);
      }),
    );
  }, [businessIdProp, user?.id, profile?.account_type]);

  const plainDescriptionPreview = useMemo(
    () => descriptionPlainText(description, buildDescriptionPayload(description, descriptionBlocks)),
    [description, descriptionBlocks],
  );

  const completionScore = useMemo(() => {
    let score = 0;
    if (showListingPhotos && photoUris.length > 0) score += 20;
    else if (!showListingPhotos) score += 20;
    if (category && subcategory) score += 10;
    if (title.trim().length >= MARKETPLACE_MIN_TITLE_LENGTH) score += 20;
    if (plainDescriptionPreview.length >= MARKETPLACE_MIN_DESCRIPTION_LENGTH) score += 20;
    if (listingType === 'free' || listingType === 'trade' || price.trim()) score += 10;
    if (district) score += 10;
    if (deliveryMode === 'meetup' || shippingNote.trim()) score += 10;
    return score;
  }, [showListingPhotos, photoUris.length, category, subcategory, title, plainDescriptionPreview, listingType, price, district, deliveryMode, shippingNote]);

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
  };

  const hydrateListing = (listing: MarketplaceListing) => {
    setCategory(listing.category);
    setSubcategory(listing.subcategory);
    setListingType(listing.listingType);
    setCondition(listing.condition);
    setDeliveryMode(listing.deliveryMode);
    setShippingNote(listing.shippingNote ?? '');
    setShowPhone(listing.showPhone);
    setContactPhone(listing.contactPhone ?? '');
    setTitle(listing.title);
    const desc = hydrateDescription(listing);
    setDescription(desc.text);
    setDescriptionBlocks(desc.blocks);
    setPrice(listing.price != null ? String(listing.price) : '');
    setDistrict(listing.district);
    setTags(listing.tags.join(', '));
    setPhotoUris(listing.mediaUrls.length ? listing.mediaUrls : listing.coverUrl ? [listing.coverUrl] : []);
  };

  useEffect(() => {
    if (!editListingId || !user?.id) return;
    (async () => {
      setLoadingListing(true);
      const listing = await fetchMarketplaceListing(editListingId);
      if (!listing || listing.authorId !== user.id) {
        Alert.alert('Hata', 'İlan düzenlenemiyor.');
        router.back();
        return;
      }
      if (!['active', 'reserved', 'sold'].includes(listing.status)) {
        Alert.alert('Hata', 'Bu ilan düzenlenemez.');
        router.back();
        return;
      }
      hydrateListing(listing);
      setLoadingListing(false);
    })();
  }, [editListingId, user?.id]);

  useEffect(() => {
    if (!cloneFromId || !user?.id || isEdit) return;
    (async () => {
      setLoadingListing(true);
      const listing = await fetchMarketplaceListing(cloneFromId);
      if (!listing || listing.authorId !== user.id) {
        Alert.alert('Hata', 'Bu ilandan varyant oluşturulamaz.');
        router.back();
        return;
      }
      if (!['active', 'reserved', 'sold'].includes(listing.status)) {
        Alert.alert('Hata', 'Bu ilandan varyant oluşturulamaz.');
        router.back();
        return;
      }
      hydrateListing(listing);
      setCloneMeta({
        sourceId: listing.id,
        variantGroupId: listing.variantGroupId ?? listing.id,
      });
      setLoadingListing(false);
    })();
  }, [cloneFromId, user?.id, isEdit]);

  const subOptions = CATEGORY_DEFS[category].subcategories.map((s) => ({ id: s.slug, label: s.label }));

  const pickPhotos = async () => {
    const remaining = MARKETPLACE_MAX_PHOTOS - photoUris.length;
    if (remaining <= 0) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Ürün fotoğrafı eklemek için galeri erişimine izin vermeniz gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MARKETPLACE_MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const setCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPhotoUris((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const handleRemoveListing = () => {
    if (!editListingId) return;
    Alert.alert('İlanı Kaldır', 'İlan yayından kaldırılacak. Devam etmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          const result = await setOwnerListingStatus(editListingId, 'removed');
          setSaving(false);
          if (result.error) {
            Alert.alert('Hata', result.error);
            return;
          }
          Alert.alert('Kaldırıldı', 'İlan yayından kaldırıldı.', [
            { text: 'Tamam', onPress: () => router.replace('/marketplace-center/my-listings' as never) },
          ]);
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (showListingPhotos && !photoUris.length) {
      Alert.alert('Fotoğraf gerekli', 'En az bir fotoğraf ekleyin.');
      return;
    }
    if (!district) {
      Alert.alert('Eksik bilgi', 'İlçe seçimi zorunludur.');
      return;
    }
    const trimmedTitle = title.trim();
    const fullBlocks = buildDescriptionPayload(description, descriptionBlocks);
    const plainDescription = descriptionPlainText(description, fullBlocks);
    if (
      trimmedTitle.length < MARKETPLACE_MIN_TITLE_LENGTH ||
      trimmedTitle.length > MARKETPLACE_MAX_TITLE_LENGTH
    ) {
      Alert.alert(
        'Başlık',
        `Başlık ${MARKETPLACE_MIN_TITLE_LENGTH}–${MARKETPLACE_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`,
      );
      return;
    }
    if (
      plainDescription.length < MARKETPLACE_MIN_DESCRIPTION_LENGTH ||
      plainDescription.length > MARKETPLACE_MAX_DESCRIPTION_LENGTH
    ) {
      Alert.alert(
        'Açıklama',
        `Açıklama en az ${MARKETPLACE_MIN_DESCRIPTION_LENGTH} karakter olmalıdır.`,
      );
      return;
    }
    if (containsBlockedFoodKeyword(`${trimmedTitle} ${plainDescription}`)) {
      Alert.alert('Yasak içerik', 'Gıda ve yiyecek ilanları bu merkezde yayınlanamaz.');
      return;
    }
    if (listingType !== 'free' && listingType !== 'trade' && !price.trim()) {
      Alert.alert('Fiyat', 'Satılık ilanlar için fiyat girin.');
      return;
    }
    if (deliveryMode === 'shipping' && !shippingNote.trim()) {
      Alert.alert('Kargo notu', 'Kargo ile teslimat için kargo/kurye bilgisi girin.');
      return;
    }
    if (showPhone && !contactPhone.trim()) {
      Alert.alert('Telefon', 'Telefon göstermek için numara girin.');
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    }

    setSaving(true);
    const localUris = photoUris.filter((u) => !u.startsWith('http'));
    const remoteUris = photoUris.filter((u) => u.startsWith('http'));
    const uploadResult = localUris.length ? await uploadMarketplaceImages(user.id, localUris) : { urls: [], error: null };
    if (uploadResult.error) {
      setSaving(false);
      Alert.alert('Fotoğraf yüklenemedi', uploadResult.error);
      return;
    }
    if (showListingPhotos && localUris.length > 0 && uploadResult.urls.length === 0) {
      setSaving(false);
      Alert.alert('Fotoğraf yüklenemedi', 'Görseller sunucuya yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    const mediaUrls = [...remoteUris, ...uploadResult.urls].slice(0, MARKETPLACE_MAX_PHOTOS);
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);

    const sharedPayload = {
      district,
      category,
      subcategory,
      title: trimmedTitle,
      description: plainDescription,
      descriptionBlocks: fullBlocks,
      price: listingType === 'free' ? 0 : price ? Number(price.replace(',', '.')) : null,
      listingType,
      condition,
      deliveryMode,
      shippingNote: deliveryMode === 'shipping' ? shippingNote.trim() : null,
      mediaUrls,
      tags: tagList,
      showPhone,
      contactPhone: showPhone ? contactPhone.trim() : null,
      latitude,
      longitude,
    };

    if (isEdit && editListingId) {
      const result = await updateMarketplaceListing(editListingId, user.id, sharedPayload);
      setSaving(false);
      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }
      Alert.alert('Güncellendi', 'İlanınız kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/detail/marketplace/${editListingId}` as never) },
      ]);
      return;
    }

    const result = await createMarketplaceListing({
      authorId: user.id,
      businessId: linkedBusinessId,
      regionId,
      ...sharedPayload,
      sourceListingId: cloneMeta?.sourceId ?? null,
      variantGroupId: cloneMeta?.variantGroupId ?? null,
    });
    setSaving(false);

    if (result.error || !result.id) {
      if (result.error === MARKETPLACE_ERROR_DUPLICATE) {
        Alert.alert(
          'Mükerrer ilan',
          'Başlık veya kapak fotoğrafını değiştirin — aynı ürün zaten yayında.',
          isBusinessFlow && businessMeta
            ? [
                { text: 'Mağaza', onPress: () => router.replace(BUSINESS_ROUTES.shop(businessMeta.id) as never) },
                { text: 'Tamam', style: 'cancel' },
              ]
            : [
                { text: 'İlanlarım', onPress: () => router.replace('/marketplace-center/my-listings' as never) },
                { text: 'Tamam', style: 'cancel' },
              ],
        );
      } else {
        Alert.alert('Hata', result.error ?? (isBusinessFlow ? 'Ürün eklenemedi.' : 'İlan oluşturulamadı.'));
      }
      return;
    }

    if (isBusinessFlow && businessMeta) {
      await appendBusinessShopShowcaseItem(businessMeta.id, 'product', result.id);
      Alert.alert('Ürün eklendi', `${businessMeta.name} mağazasında yayında.`, [
        {
          text: 'Mağazaya git',
          onPress: () => router.replace(BUSINESS_ROUTES.shop(businessMeta.id) as never),
        },
        {
          text: 'Vitrin düzenle',
          onPress: () => router.replace(BUSINESS_ROUTES.shopCurate as never),
        },
        {
          text: 'Bir tane daha',
          onPress: () => router.replace(BUSINESS_ROUTES.createProduct as never),
        },
      ]);
      return;
    }

    Alert.alert(
      isClone ? 'Varyant yayınlandı' : 'İlan yayınlandı',
      isClone ? 'Yeni varyant ilanınız listelendi.' : 'İlanınız Yerel Pazar\'da listelendi.',
      [{ text: 'Tamam', onPress: () => router.replace(`/detail/marketplace/${result.id}` as never) }],
    );
  };

  if (loadingListing) {
    return (
      <GradientBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={accent} size="large" />
          <Text secondary>İlan yükleniyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  const screenTitle = isEdit
    ? isBusinessFlow
      ? 'Ürünü Düzenle'
      : 'İlanı Düzenle'
    : isClone
      ? 'Varyant Ekle'
      : isBusinessFlow
        ? 'Mağazaya Ürün Ekle'
        : 'İlan Ver';
  const screenSubtitle = isEdit
    ? 'Fotoğraf, fiyat ve açıklamayı güncelleyin'
    : isClone
      ? 'Ana ilandan kopyalandı — farklılaştırın'
      : isBusinessFlow
        ? `${businessMeta?.name ?? 'Mağaza'} · Stripe güvenli ödeme`
        : 'Ürününüzü adım adım listeleyin';

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 },
        ]}
        scrollEnabled={!sheetOpen}
        keyboardShouldPersistTaps="handled"
        bottomOffset={48}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.topBarText}>
            <Text variant="label">{screenTitle}</Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {screenSubtitle}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={
            isDark
              ? ([`${accent}33`, `${accent}12`, 'transparent'] as const)
              : ([`${accent}28`, `${accent}10`, 'transparent'] as const)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroStrip}
        >
          <View style={styles.heroRow}>
            <LinearGradient colors={[accentGradient[0], accentGradient[1]]} style={styles.heroIcon}>
              <Ionicons name={isBusinessFlow ? 'bag-handle' : 'storefront'} size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.heroCopy}>
              <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                %{completionScore} tamamlandı
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: `${accent}22` }]}>
                <View style={[styles.progressFill, { width: `${completionScore}%`, backgroundColor: accent }]} />
              </View>
            </View>
          </View>
        </LinearGradient>

        {isBusinessFlow && businessMeta ? (
          <View style={[styles.hintBanner, { backgroundColor: `${accent}12`, borderColor: `${accent}33` }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={accent} />
            <Text secondary variant="caption" style={styles.flex}>
              Ürün mağaza vitrininize ve Yerel Pazar&apos;a eklenir. Ödemeler Stripe ile güvenli alınır.
              {businessMeta.shopTagline ? ` · ${businessMeta.shopTagline}` : ''}
            </Text>
          </View>
        ) : null}

        {isClone ? (
          <View style={[styles.hintBanner, { backgroundColor: `${accent}12`, borderColor: `${accent}33` }]}>
            <Ionicons name="information-circle-outline" size={16} color={accent} />
            <Text secondary variant="caption" style={styles.flex}>
              Başlıkta renk/kapasite belirtin ve farklı fotoğraf ekleyin. Aynı başlık + kapak mükerrer sayılır.
            </Text>
          </View>
        ) : !isEdit ? (
          <View style={[styles.hintBanner, { backgroundColor: `${colors.surface}88`, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text secondary variant="caption" style={styles.flex}>
              Günde en fazla {MARKETPLACE_MAX_DAILY_LISTINGS} yeni ilan. Aynı ürün için kopya ilan oluşturulamaz.
            </Text>
          </View>
        ) : null}

        <LivePreviewCard
          title={title}
          photoUris={photoUris}
          category={category}
          subcategory={subcategory}
          listingType={listingType}
          price={price}
          district={district}
          condition={condition}
          accent={accent}
        />

        {showListingPhotos ? (
        <ListingFormSection step={1} title="Fotoğraflar" subtitle={`Kapak görseli ilk sırada · ${photoUris.length}/${MARKETPLACE_MAX_PHOTOS}`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
            <Pressable onPress={pickPhotos} style={[styles.photoAdd, { borderColor: colors.border }]}>
              <LinearGradient colors={[`${accent}22`, `${accent}08`]} style={styles.photoAddInner}>
                <Ionicons name="camera" size={24} color={accent} />
                <Text variant="caption" style={{ color: accent, fontWeight: '600' }}>
                  Ekle
                </Text>
              </LinearGradient>
            </Pressable>
            {photoUris.map((uri, i) => (
              <PhotoTile
                key={`${uri}-${i}`}
                uri={uri}
                index={i}
                onRemove={() => removePhoto(i)}
                onSetCover={() => setCoverPhoto(i)}
                accent={accent}
              />
            ))}
          </ScrollView>
        </ListingFormSection>
        ) : null}

        <ListingFormSection step={showListingPhotos ? 2 : 1} title="Kategori & durum" subtitle="Alıcılar doğru filtrelerde sizi bulsun">
          <ListingSheetPicker
            label="Kategori"
            value={category}
            sheetTitle="Kategori seç"
            sheetSubtitle="Ürününüzün ana kategorisini belirleyin"
            searchPlaceholder="Kategori ara…"
            onOpenChange={handleSheetOpenChange}
            options={MARKETPLACE_CATEGORIES.map((c) => ({
              id: c.id,
              label: c.label,
              icon: c.icon,
              color: c.color,
            }))}
            onChange={(v) => {
              setCategory(v);
              setSubcategory(CATEGORY_DEFS[v].subcategories[0]?.slug ?? 'other');
            }}
          />
          <ListingSheetPicker
            label="Alt kategori"
            value={subcategory}
            sheetTitle="Alt kategori seç"
            sheetSubtitle={CATEGORY_DEFS[category].label}
            searchPlaceholder="Alt kategori ara…"
            onOpenChange={handleSheetOpenChange}
            options={subOptions}
            onChange={setSubcategory}
          />
          <OptionPicker
            label="Ürün durumu"
            value={condition}
            options={CONDITION_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
            onChange={setCondition}
          />
        </ListingFormSection>

        <ListingFormSection step={showListingPhotos ? 3 : 2} title="Fiyat & açıklama" subtitle="Link, fotoğraf ve video ekleyebilirsiniz">
          <MarketplaceModernPriceInput
            listingType={listingType}
            price={price}
            onPriceChange={setPrice}
            onListingTypeChange={setListingType}
          />
          <Input
            label="Başlık"
            value={title}
            onChangeText={setTitle}
            maxLength={MARKETPLACE_MAX_TITLE_LENGTH}
            placeholder="Örn: iPhone 13 Pro 256GB — Mavi"
          />
          <MarketplaceRichEditor
            text={description}
            blocks={descriptionBlocks}
            onTextChange={setDescription}
            onBlocksChange={setDescriptionBlocks}
            onUploadMedia={async (uris) => {
              if (!user?.id) return [];
              const result = await uploadMarketplaceDescriptionMedia(user.id, uris);
              if (result.error) {
                Alert.alert('Medya yüklenemedi', result.error);
              }
              return result.urls;
            }}
          />
          <Input
            label="Etiketler (virgülle, max 3)"
            value={tags}
            onChangeText={setTags}
            placeholder="ör: sıfır, garantili, acil"
          />
        </ListingFormSection>

        <ListingFormSection step={showListingPhotos ? 4 : 3} title="Konum & teslimat" subtitle="Yerel alıcılar için ilçe ve teslim şekli">
          <ListingSheetPicker
            label="İlçe"
            value={district}
            sheetTitle="İlçe seç"
            sheetSubtitle="İlanınızın bulunduğu ilçe"
            searchPlaceholder="İlçe ara…"
            onOpenChange={handleSheetOpenChange}
            options={districts.map((d) => ({ id: d, label: d }))}
            onChange={setDistrict}
          />
          <ListingSheetPicker
            label="Teslimat"
            value={deliveryMode}
            sheetTitle="Teslimat şekli"
            sheetSubtitle="Alıcıyla nasıl teslim edeceğinizi seçin"
            searchPlaceholder="Teslimat ara…"
            searchable={false}
            onOpenChange={handleSheetOpenChange}
            options={DELIVERY_MODE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
            onChange={setDeliveryMode}
          />
          {deliveryMode === 'shipping' ? (
            <Input
              label="Kargo / kurye notu"
              value={shippingNote}
              onChangeText={setShippingNote}
              placeholder="Örn: Yurtiçi Kargo, alıcı öder"
              multiline
              numberOfLines={2}
              style={styles.textarea}
            />
          ) : null}
        </ListingFormSection>

        <ListingFormSection step={showListingPhotos ? 5 : 4} title="İletişim" subtitle="Alıcılar doğrudan arayabilsin (opsiyonel)">
          <View style={[styles.switchRow, { backgroundColor: `${accent}10`, borderColor: `${accent}33` }]}>
            <View style={styles.switchCopy}>
              <Ionicons name="call-outline" size={18} color={accent} />
              <View style={styles.flex}>
                <Text variant="label">Telefonu göster</Text>
                <Text secondary variant="caption">
                  İlan detayında numaranız görünür
                </Text>
              </View>
            </View>
            <Switch
              value={showPhone}
              onValueChange={setShowPhone}
              trackColor={{ true: accent }}
            />
          </View>
          {showPhone ? (
            <Input
              label="Telefon numarası"
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
            />
          ) : null}
        </ListingFormSection>

        {isEdit ? (
          <DangerZone onRemove={handleRemoveListing} disabled={saving} />
        ) : null}
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
            { opacity: saving || pressed ? 0.88 : 1 },
          ]}
        >
          <LinearGradient
            colors={[accentGradient[0], accentGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publishGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={isEdit ? 'save' : 'rocket'} size={20} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  {isEdit
                    ? 'Değişiklikleri Kaydet'
                    : isClone
                      ? 'Varyantı Yayınla'
                      : isBusinessFlow
                        ? 'Mağazaya Ekle'
                        : 'İlanı Yayınla'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

function DangerZone({ onRemove, disabled }: { onRemove: () => void; disabled?: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.dangerZone, { borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}08` }]}>
      <Text variant="label" style={{ color: colors.danger }}>
        Tehlikeli bölge
      </Text>
      <Text secondary variant="caption">
        İlanı yayından kaldırmak geri alınabilir — İlanlarım sayfasından yeniden yayınlayabilirsiniz.
      </Text>
      <Pressable
        onPress={onRemove}
        disabled={disabled}
        style={({ pressed }) => [
          styles.dangerBtn,
          { borderColor: colors.danger, opacity: disabled || pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
          İlanı Kaldır
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: { flex: 1, gap: 2 },
  heroStrip: { borderRadius: radius.lg, padding: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
  previewCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  previewLabel: { fontWeight: '700', letterSpacing: 0.3 },
  previewCoverWrap: {
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  previewCover: { width: '100%', height: '100%' },
  previewCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFade: { ...StyleSheet.absoluteFillObject },
  previewBottom: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    gap: 4,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  previewChipText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  previewTitle: { color: '#fff', fontWeight: '700' },
  previewPrice: { color: '#fff', fontWeight: '800', fontSize: 15 },
  previewMeta: { gap: 4 },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoScroll: { gap: spacing.sm, paddingRight: spacing.sm },
  photoAdd: {
    width: 100,
    height: 100,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoAddInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoTile: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: radius.lg },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  coverBadgeText: { color: '#fff', fontWeight: '700', fontSize: 9 },
  photoRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: { minHeight: 64, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dangerZone: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: { borderRadius: radius.full, overflow: 'hidden' },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
