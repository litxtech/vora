import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { MarketplaceGridCard } from '@/features/marketplace/components/MarketplaceGridCard';
import { MarketplacePhotoViewer } from '@/features/marketplace/components/MarketplacePhotoViewer';
import { MarketplaceOfferSheet } from '@/features/marketplace/components/MarketplaceOfferSheet';
import { MarketplaceOffersPanel } from '@/features/marketplace/components/MarketplaceOffersPanel';
import { MarketplaceOwnerPanel } from '@/features/marketplace/components/MarketplaceOwnerPanel';
import { MarketplaceBuyerFooter } from '@/features/marketplace/components/MarketplaceBuyerFooter';
import { MarketplaceCommentComposer } from '@/features/marketplace/components/MarketplaceCommentComposer';
import { MarketplaceCommentRow } from '@/features/marketplace/components/MarketplaceCommentRow';
import { MarketplaceDescriptionView } from '@/features/marketplace/components/MarketplaceDescriptionView';
import { MarketplaceListingStats } from '@/features/marketplace/components/MarketplaceListingStats';
import { MarketplacePriceTrend } from '@/features/marketplace/components/MarketplacePriceTrend';
import { MarketplaceShareSheet } from '@/features/marketplace/components/MarketplaceShareSheet';
import { MarketplaceVariantsStrip } from '@/features/marketplace/components/MarketplaceVariantsStrip';
import {
  categoryLabel,
  categoryColor,
  CONDITION_OPTIONS,
  DELIVERY_MODE_OPTIONS,
  formatMarketplacePrice,
  formatCents,
  LISTING_TYPE_OPTIONS,
  listingEditPath,
  MARKETPLACE_ACCENT,
  MARKETPLACE_MIN_CHECKOUT_CENTS,
  OFFER_STATUS_LABELS,
  subcategoryLabel,
} from '@/features/marketplace/constants';
import { addMarketplaceComment, fetchMarketplaceComments } from '@/features/marketplace/services/commentData';
import { toggleMarketplaceFavorite, fetchFavoriteIds } from '@/features/marketplace/services/favoriteData';
import { startMarketplaceInquiry, reportMarketplaceListing } from '@/features/marketplace/services/inquiryData';
import { MARKETPLACE_FEATURE } from '@/features/marketplace/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import {
  getCachedMarketplaceListing,
  setCachedMarketplaceListing,
} from '@/features/marketplace/services/marketplaceDetailCache';
import {
  fetchListingOffers,
  fetchMyOfferForListing,
  withdrawMarketplaceOffer,
} from '@/features/marketplace/services/offerData';
import {
  fetchListingOrderForUser,
  startMarketplaceCheckout,
} from '@/features/marketplace/services/orderData';
import { fetchMarketplacePriceHistory } from '@/features/marketplace/services/priceHistory';
import { uploadMarketplaceCommentMedia } from '@/features/marketplace/services/mediaUpload';
import {
  fetchMarketplaceListing,
  fetchSimilarListings,
  fetchListingVariants,
  setOwnerListingStatus,
} from '@/features/marketplace/services/listingData';
import type {
  MarketplaceComment,
  MarketplaceCommentKind,
  MarketplaceListing,
  MarketplaceListingStatus,
  MarketplaceOffer,
  MarketplaceOrder,
  MarketplacePricePoint,
} from '@/features/marketplace/types';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type CompactBtnProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'muted';
  loading?: boolean;
  disabled?: boolean;
  flex?: number;
  accent?: string;
};

function CompactBtn({
  label,
  icon,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  flex,
  accent,
}: CompactBtnProps) {
  const { colors } = useTheme();
  const tone = accent ?? MARKETPLACE_ACCENT;

  const bg =
    variant === 'primary'
      ? tone
      : variant === 'outline'
        ? 'transparent'
        : `${colors.surface}CC`;
  const border = variant === 'outline' ? colors.border : 'transparent';
  const textColor = variant === 'primary' ? '#fff' : variant === 'outline' ? colors.text : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.compactBtn,
        flex != null && { flex },
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: disabled || loading ? 0.55 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={15} color={textColor} /> : null}
          <Text variant="caption" style={[styles.compactBtnLabel, { color: textColor }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function IconCircle({
  icon,
  onPress,
  color,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color: string;
  active?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconCircle,
        {
          backgroundColor: active ? `${MARKETPLACE_ACCENT}22` : `${colors.surface}E6`,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

export function MarketplaceDetailScreen() {
  const { id, buy, checkout, offer } = useLocalSearchParams<{
    id: string;
    buy?: string;
    checkout?: string;
    offer?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const showDetailFavorite = useFeatureVisible(MARKETPLACE_FEATURE.detailFavorite);
  const showDetailShare = useFeatureVisible(MARKETPLACE_FEATURE.detailShare);
  const showDetailReport = useFeatureVisible(MARKETPLACE_FEATURE.detailReport);
  const showDetailMessage = useFeatureVisible(MARKETPLACE_FEATURE.detailMessage);
  const showDetailBuy = useFeatureVisible(MARKETPLACE_FEATURE.detailBuy);
  const showDetailOffer = useFeatureVisible(MARKETPLACE_FEATURE.detailOffer);
  const showDetailEdit = useFeatureVisible(MARKETPLACE_FEATURE.detailEdit);
  const showDetailOwnerMenu = useFeatureVisible(MARKETPLACE_FEATURE.detailOwnerMenu);

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [similar, setSimilar] = useState<MarketplaceListing[]>([]);
  const [variants, setVariants] = useState<MarketplaceListing[]>([]);
  const [comments, setComments] = useState<MarketplaceComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentMediaUris, setCommentMediaUris] = useState<string[]>([]);
  const [commentKind, setCommentKind] = useState<MarketplaceCommentKind>('general');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [priceHistory, setPriceHistory] = useState<MarketplacePricePoint[]>([]);
  const [order, setOrder] = useState<MarketplaceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const buyPromptShown = useRef(false);
  const offerPromptShown = useRef(false);
  const [myOffer, setMyOffer] = useState<MarketplaceOffer | null>(null);
  const [ownerActionLoading, setOwnerActionLoading] = useState(false);

  const applyOwnerStatus = (status: MarketplaceListingStatus, confirm?: string) => {
    if (!listing) return;
    const run = async () => {
      setOwnerActionLoading(true);
      const result = await setOwnerListingStatus(listing.id, status);
      setOwnerActionLoading(false);
      if (result.error) Alert.alert('Hata', result.error);
      else load();
    };
    if (confirm) {
      Alert.alert('Onay', confirm, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const handleOwnerMenu = () => {
    if (!listing) return;
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    if (listing.status !== 'removed' && listing.status !== 'archived') {
      options.push({ text: 'Düzenle', onPress: () => router.push(listingEditPath(listing.id) as never) });
    }
    if (listing.status === 'active') {
      options.push({
        text: 'Satıldı işaretle',
        onPress: () => applyOwnerStatus('sold', 'İlan satıldı olarak işaretlensin mi?'),
      });
      options.push({
        text: 'Rezerve et',
        onPress: () => applyOwnerStatus('reserved', 'İlan geçici olarak rezerve edilsin mi?'),
      });
    }
    if (listing.status === 'reserved' || listing.status === 'sold') {
      options.push({
        text: 'Satılığa çıkar',
        onPress: () =>
          applyOwnerStatus(
            'active',
            listing.status === 'sold' ? 'Ürün tekrar satışa sunulsun mu?' : undefined,
          ),
      });
    }
    if (listing.status === 'removed') {
      options.push({
        text: 'Yeniden yayınla',
        onPress: () => applyOwnerStatus('active', 'İlan tekrar yayınlansın mı?'),
      });
    }
    if (listing.status !== 'removed') {
      options.push({
        text: 'İlanı kaldır',
        style: 'destructive',
        onPress: () => applyOwnerStatus('removed', 'İlan kaldırılsın mı?'),
      });
    }
    if (listing.status === 'sold' || listing.status === 'removed') {
      options.push({
        text: 'Arşivle',
        onPress: () => applyOwnerStatus('archived', 'İlan arşive alınsın mı?'),
      });
    }
    options.push({ text: 'Vazgeç', style: 'cancel' });
    Alert.alert('İlan yönetimi', undefined, options);
  };

  const load = useCallback(async (background = false) => {
    if (!id) return;

    const cached = getCachedMarketplaceListing(id);
    if (cached && !background) {
      setListing(cached);
      setLoading(false);
    } else if (!background && !cached) {
      setLoading(true);
    }

    const data = await fetchMarketplaceListing(id);
    if (data) {
      setCachedMarketplaceListing(id, data);
      setSimilar(await fetchSimilarListings(data));
      setVariants(await fetchListingVariants(data));
      setComments(await fetchMarketplaceComments(id, data.authorId));
      setPriceHistory(await fetchMarketplacePriceHistory(id));
      if (user?.id) {
        const favIds = await fetchFavoriteIds(user.id);
        setListing({ ...data, isFavorite: favIds.has(data.id) });
        setOrder(await fetchListingOrderForUser(id, user.id));
        if (user.id === data.authorId) {
          setOffers(await fetchListingOffers(id));
          setMyOffer(null);
        } else {
          setOffers([]);
          setMyOffer(await fetchMyOfferForListing(id, user.id));
        }
      } else {
        setListing(data);
        setOffers([]);
        setMyOffer(null);
      }
    } else if (!cached) {
      setListing(null);
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    setSimilar([]);
    setVariants([]);
    setComments([]);
    setPriceHistory([]);
    setOrder(null);
    setOffers([]);
    setMyOffer(null);

    const cached = id ? getCachedMarketplaceListing(id) : null;
    if (cached) {
      setListing(cached);
      setLoading(false);
      void load(true);
      return;
    }
    setListing(null);
    void load(false);
  }, [id, load]);

  const isOwner = user?.id === listing?.authorId;
  const canCheckout =
    listing &&
    listing.status === 'active' &&
    listing.listingType !== 'free' &&
    listing.listingType !== 'trade' &&
    listing.price != null &&
    listing.price * 100 >= MARKETPLACE_MIN_CHECKOUT_CENTS &&
    !isOwner;
  const canOffer =
    listing &&
    listing.status === 'active' &&
    listing.listingType !== 'free' &&
    !isOwner &&
    !order;
  const offerLabel =
    listing?.listingType === 'trade' ? 'Takas teklif et' : 'Teklif ver';

  const handleCheckout = async () => {
    if (!(await requireAuth('Satın alma')) || !listing) return;
    Alert.alert(
      'Güvenli Satın Al',
      'Ödemeniz platform güvencesinde tutulur. Teslim onayınızdan sonra satıcıya en geç 9 gün içinde ödeme yapılır (%15 komisyon).',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Devam',
          onPress: async () => {
            setCheckoutLoading(true);
            const result = await startMarketplaceCheckout(listing.id);
            setCheckoutLoading(false);
            if (result.error) Alert.alert('Hata', result.error);
            else load();
          },
        },
      ],
    );
  };

  const handleCheckoutRef = useRef(handleCheckout);
  handleCheckoutRef.current = handleCheckout;

  useEffect(() => {
    if (buyPromptShown.current || loading || !listing) return;
    const wantsBuy = buy === '1' || checkout === 'success';
    if (!wantsBuy || isOwner) return;
    if (!canCheckout) return;

    buyPromptShown.current = true;
    if (checkout === 'success') {
      Alert.alert('Ödeme alındı', 'Siparişiniz oluşturuldu. Satıcı ile teslimatı koordine edebilirsiniz.');
      return;
    }
    Alert.alert(
      'Bu ürünü satın al',
      `${listing.title}\n\nGüvenli ödeme ile satın almak ister misiniz?`,
      [
        { text: 'Sonra', style: 'cancel' },
        { text: 'Satın al', onPress: () => handleCheckoutRef.current() },
      ],
    );
  }, [buy, checkout, loading, listing, isOwner, canCheckout]);

  const handleFavorite = async () => {
    if (!(await requireAuth('Favori')) || !user || !listing) return;
    await toggleMarketplaceFavorite(user.id, listing.id, !!listing.isFavorite);
    load();
  };

  const handleWithdrawOffer = () => {
    if (!myOffer || myOffer.status !== 'pending') return;
    Alert.alert('Teklifi geri çek', 'Teklifiniz iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Geri çek',
        style: 'destructive',
        onPress: async () => {
          const result = await withdrawMarketplaceOffer(myOffer.id);
          if (result.error) Alert.alert('Hata', result.error);
          else load();
        },
      },
    ]);
  };

  const handleOpenOffer = async () => {
    if (!(await requireAuth('Teklif')) || !listing) return;
    if (myOffer?.status === 'pending') {
      Alert.alert('Bekleyen teklifiniz var', 'Yeni teklif göndermek mevcut teklifi günceller.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Devam', onPress: () => setOfferOpen(true) },
      ]);
      return;
    }
    setOfferOpen(true);
  };
  const handleOpenOfferRef = useRef(handleOpenOffer);
  handleOpenOfferRef.current = handleOpenOffer;

  useEffect(() => {
    if (offerPromptShown.current || loading || !listing) return;
    if (offer !== '1' || isOwner) return;
    if (!canOffer) return;

    offerPromptShown.current = true;
    Alert.alert(
      listing.listingType === 'trade' ? 'Takas teklifi' : 'Teklif ver',
      `${listing.title}\n\nTeklif göndermek ister misiniz?`,
      [
        { text: 'Sonra', style: 'cancel' },
        { text: offerLabel, onPress: () => handleOpenOfferRef.current() },
      ],
    );
  }, [offer, loading, listing, isOwner, canOffer, offerLabel]);

  const handleMessage = async () => {
    if (!(await requireAuth('Mesaj')) || !listing) return;
    const result = await startMarketplaceInquiry(listing.id, user!.id, '');
    if (result.error) Alert.alert('Hata', result.error);
    else if (result.conversationId) router.push(`/chat/${result.conversationId}` as never);
  };

  const handleComment = async () => {
    if (!(await requireAuth('Yorum')) || !user || !listing) return;
    if (!commentText.trim() && commentMediaUris.length === 0) return;

    setCommentSubmitting(true);
    const uploadResult = commentMediaUris.length
      ? await uploadMarketplaceCommentMedia(user.id, commentMediaUris)
      : { urls: [], error: null };
    if (uploadResult.error) {
      setCommentSubmitting(false);
      Alert.alert('Medya yüklenemedi', uploadResult.error);
      return;
    }
    const mediaUrls = uploadResult.urls;
    const result = await addMarketplaceComment(listing.id, user.id, commentText, {
      mediaUrls,
      commentKind,
    });
    setCommentSubmitting(false);

    if (result.error) Alert.alert('Hata', result.error);
    else {
      setCommentText('');
      setCommentMediaUris([]);
      setCommentKind('general');
      setComments(await fetchMarketplaceComments(listing.id, listing.authorId));
    }
  };

  const canShareBuyerProof =
    !!order &&
    order.buyerId === user?.id &&
    !['cancelled', 'refunded'].includes(order.status);

  const handleReport = async () => {
    if (!(await requireAuth('Rapor')) || !user || !listing) return;
    Alert.alert('İlanı rapor et', 'Neden?', [
      { text: 'Yanıltıcı', onPress: () => reportMarketplaceListing(listing.id, user.id, 'misleading') },
      { text: 'Spam', onPress: () => reportMarketplaceListing(listing.id, user.id, 'spam') },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  if (loading || !listing) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={MARKETPLACE_ACCENT} />
          ) : (
            <Text secondary>İlan bulunamadı.</Text>
          )}
        </View>
      </GradientBackground>
    );
  }

  const photos = listing.mediaUrls.length ? listing.mediaUrls : listing.coverUrl ? [listing.coverUrl] : [];
  const priceLabel = formatMarketplacePrice(listing.price, listing.listingType, listing.currency);
  const typeLabel = LISTING_TYPE_OPTIONS.find((t) => t.value === listing.listingType)?.label;
  const accent = categoryColor(listing.category);
  const isFree = listing.listingType === 'free';
  const isTrade = listing.listingType === 'trade';
  const showBuyerFooter = !isOwner && listing.status === 'active';
  const showOwnerFooter = isOwner && listing.status !== 'archived';
  const showCommentComposer = !!user;
  const deliveryLabel = DELIVERY_MODE_OPTIONS.find((d) => d.value === listing.deliveryMode)?.label;
  const scrollBottomPad =
    insets.bottom +
    spacing.lg +
    (showBuyerFooter ? 64 : 0) +
    (showOwnerFooter ? 76 : 0) +
    (showCommentComposer ? 132 : 0);

  return (
    <GradientBackground style={styles.screen}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={showCommentComposer ? 16 : 0}
        extraKeyboardSpace={spacing.sm}
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
      >
        <View style={styles.galleryWrap}>
          {photos.length ? (
            <>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width,
                  );
                  setPhotoIndex(idx);
                }}
                renderItem={({ item, index: i }) => (
                  <Pressable onPress={async () => { setPhotoIndex(i); setViewerOpen(true); }}>
                    <Image source={{ uri: item }} style={[styles.hero, { width }]} />
                  </Pressable>
                )}
                keyExtractor={(u, i) => `${u}-${i}`}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.25)', `${colors.background}E8`]}
                locations={[0, 0.55, 1]}
                style={styles.heroFade}
                pointerEvents="none"
              />
              {photos.length > 1 ? (
                <View style={styles.dots}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.45)' },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.heroPlaceholder, { width, backgroundColor: `${accent}14` }]}>
              <Ionicons name="image-outline" size={40} color={accent} />
            </View>
          )}

          <View style={[styles.galleryOverlay, { paddingTop: insets.top + spacing.xs }]}>
            <IconCircle icon="chevron-back" onPress={() => router.back()} color={colors.text} />
            <View style={styles.galleryActions}>
              {showDetailFavorite ? (
              <IconCircle
                icon={listing.isFavorite ? 'heart' : 'heart-outline'}
                onPress={handleFavorite}
                color={listing.isFavorite ? MARKETPLACE_ACCENT : colors.text}
                active={listing.isFavorite}
              />
              ) : null}
              {showDetailShare ? (
              <IconCircle
                icon="share-outline"
                onPress={() => setShareOpen(true)}
                color={colors.text}
              />
              ) : null}
              {!isOwner && showDetailReport ? (
                <IconCircle icon="flag-outline" onPress={handleReport} color={colors.textMuted} />
              ) : isOwner && showDetailOwnerMenu ? (
                <IconCircle icon="ellipsis-horizontal" onPress={handleOwnerMenu} color={colors.text} />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text
              variant="h2"
              style={[
                styles.price,
                isFree && { color: colors.success },
                isTrade && { color: MARKETPLACE_ACCENT },
              ]}
            >
              {priceLabel}
            </Text>
            {typeLabel && listing.listingType !== 'sale' ? (
              <View style={[styles.typeBadge, { backgroundColor: `${MARKETPLACE_ACCENT}18` }]}>
                <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '600' }}>
                  {typeLabel}
                </Text>
              </View>
            ) : null}
            {listing.status === 'reserved' ? (
              <View style={[styles.typeBadge, { backgroundColor: `${colors.warning}18` }]}>
                <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
                  Rezerve
                </Text>
              </View>
            ) : null}
            {listing.status === 'sold' ? (
              <View style={[styles.typeBadge, { backgroundColor: `${colors.textMuted}22` }]}>
                <Text variant="caption" style={{ color: colors.textMuted, fontWeight: '600' }}>
                  Satıldı
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="h3" style={styles.title}>
            {listing.title}
          </Text>

          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: `${accent}14` }]}>
              <Ionicons name="pricetag-outline" size={12} color={accent} />
              <Text variant="caption" style={{ color: accent }}>
                {categoryLabel(listing.category)} · {subcategoryLabel(listing.category, listing.subcategory)}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: `${colors.primary}12` }]}>
              <Text variant="caption">
                {CONDITION_OPTIONS.find((c) => c.value === listing.condition)?.label}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <MetaItem icon="location-outline" label={listing.district} />
            {deliveryLabel ? (
              <MetaItem
                icon={listing.deliveryMode === 'shipping' ? 'cube-outline' : 'hand-left-outline'}
                label={deliveryLabel}
              />
            ) : null}
          </View>

          {listing.deliveryMode === 'shipping' && listing.shippingNote ? (
            <View style={[styles.shippingNote, { backgroundColor: `${MARKETPLACE_ACCENT}10`, borderColor: `${MARKETPLACE_ACCENT}33` }]}>
              <Ionicons name="information-circle-outline" size={16} color={MARKETPLACE_ACCENT} />
              <Text secondary variant="caption" style={styles.flex}>
                {listing.shippingNote}
              </Text>
            </View>
          ) : null}

          {listing.showPhone && listing.contactPhone ? (
            <Pressable
              onPress={() => void openUrl(`tel:${listing.contactPhone}`)}
              style={[styles.contactRow, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}33` }]}
            >
              <Ionicons name="call-outline" size={18} color={colors.success} />
              <View style={styles.flex}>
                <Text variant="caption" muted>
                  Satıcı telefonu
                </Text>
                <Text variant="label" style={{ color: colors.success }}>
                  {listing.contactPhone}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <MarketplaceListingStats listing={listing} />
          <MarketplacePriceTrend listing={listing} history={priceHistory} />

          {listing.authorName ? (
            <Pressable
              style={[styles.sellerRow, { backgroundColor: `${colors.surface}AA`, borderColor: colors.border }]}
              onPress={() => listing.authorId && router.push(`/user/${listing.authorId}` as never)}
            >
              <View style={styles.sellerAvatar}>
                {listing.authorAvatarUrl ? (
                  <Image source={{ uri: listing.authorAvatarUrl }} style={styles.sellerAvatarImage} />
                ) : (
                  <View style={[styles.sellerAvatarFallback, { backgroundColor: `${MARKETPLACE_ACCENT}20` }]}>
                    <Ionicons name="person-outline" size={18} color={MARKETPLACE_ACCENT} />
                  </View>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <Text variant="label">{listing.authorName}</Text>
                <Text secondary variant="caption">
                  Satıcı
                  {listing.authorVerified ? ' · Doğrulanmış' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <MarketplaceVariantsStrip variants={variants} />

          <GlassCard style={styles.descCard}>
            <Text variant="label" style={styles.sectionTitle}>
              Açıklama
            </Text>
            <MarketplaceDescriptionView listing={listing} />
          </GlassCard>

          {isOwner ? (
            <>
              <MarketplaceOffersPanel
                offers={offers}
                listingType={listing.listingType}
                onChanged={load}
              />
              <MarketplaceOwnerPanel listing={listing} order={order} onChanged={load} />
            </>
          ) : order ? (
            <CompactBtn
              label="Sipariş detayı"
              icon="receipt-outline"
              variant="outline"
              onPress={() => router.push(`/marketplace-center/order/${order.id}` as never)}
            />
          ) : myOffer ? (
            <GlassCard style={styles.myOfferCard}>
              <View style={styles.myOfferHeader}>
                <Ionicons name="pricetag-outline" size={16} color={MARKETPLACE_ACCENT} />
                <Text variant="label">Teklifiniz</Text>
                <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, marginLeft: 'auto' }}>
                  {OFFER_STATUS_LABELS[myOffer.status]}
                </Text>
              </View>
              {myOffer.amountCents ? (
                <Text variant="label">{formatCents(myOffer.amountCents, myOffer.currency)}</Text>
              ) : null}
              {myOffer.message ? (
                <Text secondary variant="caption">
                  {myOffer.message}
                </Text>
              ) : null}
              {myOffer.status === 'pending' ? (
                <CompactBtn
                  label="Teklifi geri çek"
                  icon="close-circle-outline"
                  variant="outline"
                  onPress={handleWithdrawOffer}
                />
              ) : myOffer.status === 'accepted' ? (
                <CompactBtn
                  label="Satıcıya mesaj at"
                  icon="chatbubble-outline"
                  onPress={handleMessage}
                />
              ) : null}
            </GlassCard>
          ) : null}

          <View style={styles.commentsSection}>
            <Text variant="label" style={styles.sectionTitle}>
              Sorular · {listing.commentCount}
            </Text>
            {comments.length === 0 ? (
              <Text secondary variant="caption">
                Henüz yorum yok. Satıcıya soru sorabilirsiniz.
              </Text>
            ) : (
              comments.slice(0, 12).map((c) => <MarketplaceCommentRow key={c.id} comment={c} />)
            )}
          </View>

          {similar.length ? (
            <View style={styles.similarSection}>
              <Text variant="label" style={styles.sectionTitle}>
                Benzer ilanlar
              </Text>
              <View style={styles.similarGrid}>
                {similar.map((s) => (
                  <View key={s.id} style={styles.similarItem}>
                    <MarketplaceGridCard listing={s} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      {showBuyerFooter && (showDetailBuy || showDetailMessage || showDetailOffer) ? (
        <MarketplaceBuyerFooter
          canCheckout={!!canCheckout && showDetailBuy}
          canOffer={!!canOffer && showDetailOffer}
          isFree={!!isFree}
          offerLabel={offerLabel}
          checkoutLoading={checkoutLoading}
          onMessage={showDetailMessage ? handleMessage : () => {}}
          onOffer={showDetailOffer ? handleOpenOffer : () => {}}
          onCheckout={showDetailBuy ? handleCheckout : () => {}}
          bottomInset={0}
        />
      ) : null}

      {showOwnerFooter && (showDetailEdit || showDetailOwnerMenu) ? (
        <View
          style={[
            styles.ownerStickyBar,
            {
              paddingBottom: insets.bottom + spacing.sm,
              borderTopColor: colors.border,
              backgroundColor: `${colors.surface}F2`,
            },
          ]}
        >
          {showDetailEdit ? (
          <Pressable
            onPress={() => router.push(listingEditPath(listing.id) as never)}
            style={({ pressed }) => [
              styles.ownerStickySecondary,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={18} color={MARKETPLACE_ACCENT} />
            <Text variant="caption" style={{ fontWeight: '700', color: MARKETPLACE_ACCENT }}>
              Düzenle
            </Text>
          </Pressable>
          ) : null}
          {showDetailOwnerMenu && listing.status === 'active' ? (
            <Pressable
              onPress={() => applyOwnerStatus('sold', 'İlan satıldı olarak işaretlensin mi?')}
              disabled={ownerActionLoading}
              style={({ pressed }) => [
                styles.ownerStickyCta,
                { backgroundColor: MARKETPLACE_ACCENT, opacity: ownerActionLoading || pressed ? 0.88 : 1 },
              ]}
            >
              {ownerActionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text variant="label" style={{ color: '#fff' }}>
                    Satıldı
                  </Text>
                </>
              )}
            </Pressable>
          ) : showDetailOwnerMenu && listing.status === 'reserved' ? (
            <Pressable
              onPress={() => applyOwnerStatus('active')}
              disabled={ownerActionLoading}
              style={({ pressed }) => [
                styles.ownerStickyCta,
                { backgroundColor: MARKETPLACE_ACCENT, opacity: ownerActionLoading || pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="storefront-outline" size={20} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                Satılığa Çıkar
              </Text>
            </Pressable>
          ) : showDetailOwnerMenu && listing.status === 'sold' ? (
            <Pressable
              onPress={() => applyOwnerStatus('active', 'Ürün tekrar satışa sunulsun mu?')}
              disabled={ownerActionLoading}
              style={({ pressed }) => [
                styles.ownerStickyCta,
                { backgroundColor: colors.success, opacity: ownerActionLoading || pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                Tekrar Sat
              </Text>
            </Pressable>
          ) : showDetailOwnerMenu && listing.status === 'removed' ? (
            <Pressable
              onPress={() => applyOwnerStatus('active', 'İlan tekrar yayınlansın mı?')}
              disabled={ownerActionLoading}
              style={({ pressed }) => [
                styles.ownerStickyCta,
                { backgroundColor: MARKETPLACE_ACCENT, opacity: ownerActionLoading || pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                Yeniden Yayınla
              </Text>
            </Pressable>
          ) : showDetailOwnerMenu ? (
            <Pressable
              onPress={handleOwnerMenu}
              style={({ pressed }) => [
                styles.ownerStickyCta,
                { backgroundColor: `${colors.textMuted}33`, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
              <Text variant="label">Yönet</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showCommentComposer ? (
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View
            style={[
              styles.commentSticky,
              {
                backgroundColor: `${colors.background}F8`,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + spacing.xs,
              },
            ]}
          >
            <MarketplaceCommentComposer
              value={commentText}
              onChange={setCommentText}
              mediaUris={commentMediaUris}
              onMediaChange={setCommentMediaUris}
              commentKind={commentKind}
              onCommentKindChange={setCommentKind}
              canShareBuyerProof={canShareBuyerProof}
              onSubmit={handleComment}
              submitting={commentSubmitting}
            />
          </View>
        </KeyboardStickyView>
      ) : null}

      <MarketplaceOfferSheet
        visible={offerOpen}
        listing={listing}
        onClose={() => setOfferOpen(false)}
        onSubmitted={() => {
          Alert.alert('Teklif gönderildi', 'Satıcı teklifinizi değerlendirecek.');
          load();
        }}
      />

      <MarketplaceShareSheet
        visible={shareOpen}
        listing={listing}
        onClose={() => setShareOpen(false)}
      />

      <MarketplacePhotoViewer
        visible={viewerOpen}
        photos={photos}
        initialIndex={photoIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setPhotoIndex}
      />
    </GradientBackground>
  );
}

function MetaItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text secondary variant="caption">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  galleryWrap: { position: 'relative' },
  hero: { height: 340 },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroPlaceholder: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  galleryActions: { flexDirection: 'row', gap: spacing.xs },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  price: { fontWeight: '800', letterSpacing: -0.5 },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  title: { fontWeight: '700', lineHeight: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  shippingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sellerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sellerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: { flex: 1, gap: 2 },
  descCard: { gap: spacing.xs, padding: spacing.md },
  myOfferCard: { gap: spacing.sm, padding: spacing.md },
  myOfferHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { marginBottom: 2 },
  description: { lineHeight: 22 },
  ownerActions: { flexDirection: 'row', gap: spacing.sm },
  commentsSection: { gap: spacing.sm },
  commentSticky: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  commentBubble: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: 2,
  },
  commentAuthor: { fontWeight: '700' },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 80,
    paddingVertical: spacing.xs,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  similarSection: { gap: spacing.sm, marginTop: spacing.xs },
  similarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  similarItem: { width: '48%' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  compactBtnLabel: { fontWeight: '700', fontSize: 13 },
  ownerStickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ownerStickySecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    minWidth: 110,
  },
  ownerStickyCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
});
