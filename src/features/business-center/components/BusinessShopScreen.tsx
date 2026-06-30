import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { BusinessShopActivityStrip } from '@/features/business-center/components/BusinessShopActivityStrip';
import { BusinessShopHighlightCarousel } from '@/features/business-center/components/BusinessShopHighlightCarousel';
import { BusinessShopHotelCard } from '@/features/business-center/components/BusinessShopHotelCard';
import { BusinessShopOwnerBar } from '@/features/business-center/components/BusinessShopOwnerBar';
import { BusinessShopProductCard } from '@/features/business-center/components/BusinessShopProductCard';
import { BusinessShopProductFilters } from '@/features/business-center/components/BusinessShopProductFilters';
import { BusinessShopSectionHeader } from '@/features/business-center/components/BusinessShopSectionHeader';
import { BusinessShopShowcasePanel } from '@/features/business-center/components/BusinessShopShowcasePanel';
import { BusinessShopTrustBar } from '@/features/business-center/components/BusinessShopTrustBar';
import {
  BUSINESS_ROUTES,
  COMMERCE_MODE_LABELS,
  commerceModeShowsHotels,
  commerceModeShowsProducts,
  commerceModeIsShowcase,
  shopAccentColor,
} from '@/features/business-center/constants';
import { fetchBusinessShopSnapshot } from '@/features/business-center/services/businessShopData';
import {
  fetchBusinessShopContext,
  trackBusinessShopView,
  type BusinessShopContext,
} from '@/features/business-center/services/businessShopContext';
import { shareBusinessShop } from '@/features/business-center/services/businessShopShare';
import { openBusinessShopDirections } from '@/features/business-center/services/businessShopDirections';
import { getShopFavoriteIds, toggleShopFavorite } from '@/features/business-center/services/shopFavorites';
import type { BusinessShopSnapshot } from '@/features/business-center/types';
import type { MarketplaceCategory } from '@/features/marketplace/types';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  businessId: string;
};

type GridItem =
  | { kind: 'product'; id: string; product: BusinessShopSnapshot['products'][number] }
  | { kind: 'hotel'; id: string; hotel: BusinessShopSnapshot['hotels'][number] };

type ShopFilter = 'all' | 'products' | 'hotels';

function shopItemDistrict(item: GridItem): string | null {
  const value = item.kind === 'product' ? item.product.district : item.hotel.district;
  const trimmed = value?.trim();
  return trimmed || null;
}

function aggregateHotelRating(
  hotels: BusinessShopSnapshot['hotels'],
): { avg: number; count: number } | null {
  let reviewCount = 0;
  let weighted = 0;
  for (const hotel of hotels) {
    if (hotel.reviewCount > 0) {
      weighted += hotel.ratingAvg * hotel.reviewCount;
      reviewCount += hotel.reviewCount;
    }
  }
  if (reviewCount === 0) return null;
  return { avg: weighted / reviewCount, count: reviewCount };
}

function buildShopGalleryUrls(
  business: BusinessShopSnapshot['business'],
  products: BusinessShopSnapshot['products'],
): string[] {
  const urls: string[] = [];
  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || urls.includes(trimmed)) return;
    urls.push(trimmed);
  };
  push(business.coverUrl);
  push(business.logoUrl);
  for (const product of products) {
    push(product.coverUrl);
    for (const media of product.mediaUrls.slice(0, 2)) push(media);
    if (urls.length >= 10) break;
  }
  return urls.slice(0, 10);
}

function FilterChip({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active
          ? { backgroundColor: accent, borderColor: accent }
          : { backgroundColor: `${accent}12`, borderColor: `${accent}30` },
        pressed && { opacity: 0.86 },
      ]}
    >
      <Text
        variant="caption"
        style={{ fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: `${accent}10`, borderColor: `${accent}24` },
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BusinessShopScreen({ businessId }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [snapshot, setSnapshot] = useState<BusinessShopSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ShopFilter>('all');
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MarketplaceCategory | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [displayViewCount, setDisplayViewCount] = useState(0);
  const [shopContext, setShopContext] = useState<BusinessShopContext>({
    campaigns: [],
    events: [],
    jobs: [],
  });
  const [viewerUrls, setViewerUrls] = useState<string[]>([]);
  const trackedView = useRef(false);

  const load = useCallback(async () => {
    const preview = await fetchBusinessShopSnapshot(businessId);
    const ownerView = Boolean(user?.id && preview?.business.ownerId === user.id);
    setIsOwner(ownerView);

    const data = ownerView
      ? (await fetchBusinessShopSnapshot(businessId, { includeHiddenShowcase: true })) ?? preview
      : preview;
    setSnapshot(data);

    if (data) {
      setDisplayViewCount(data.business.viewCount);
      const [context, favoriteIds] = await Promise.all([
        fetchBusinessShopContext(data.business.id, data.business.ownerId),
        getShopFavoriteIds(user?.id),
      ]);
      setShopContext(context);
      setIsFavorite(favoriteIds.has(data.business.id));
    }

    setLoading(false);
  }, [businessId, user?.id]);

  useEffect(() => {
    trackedView.current = false;
    setLoading(true);
    void load();
  }, [load, businessId]);

  useEffect(() => {
    if (!snapshot || isOwner || trackedView.current) return;
    trackedView.current = true;
    void trackBusinessShopView(snapshot.business.id, false).then(() => {
      setDisplayViewCount((count) => count + 1);
    });
  }, [snapshot, isOwner]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const accent = shopAccentColor(snapshot?.business.shopAccent);

  const openShopMedia = (preferCover = false) => {
    if (!snapshot) return;
    const { coverUrl, logoUrl } = snapshot.business;
    const urls: string[] = [];
    if (preferCover && coverUrl) urls.push(coverUrl);
    else if (logoUrl) urls.push(logoUrl);
    else if (coverUrl) urls.push(coverUrl);
    if (urls.length) setViewerUrls(urls);
  };

  const gridItems: GridItem[] = useMemo(() => {
    if (!snapshot) return [];
    const items: GridItem[] = [];
    if (commerceModeShowsProducts(snapshot.business.commerceMode)) {
      for (const product of snapshot.products) {
        items.push({ kind: 'product', id: `p-${product.id}`, product });
      }
    }
    if (commerceModeShowsHotels(snapshot.business.commerceMode)) {
      for (const hotel of snapshot.hotels) {
        items.push({ kind: 'hotel', id: `h-${hotel.id}`, hotel });
      }
    }
    return items;
  }, [snapshot]);

  const productCount = snapshot?.products.length ?? 0;
  const hotelCount = snapshot?.hotels.length ?? 0;
  const hasProducts = productCount > 0;
  const hasHotels = hotelCount > 0;
  const showFilters = hasProducts && hasHotels;

  const districtOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of gridItems) {
      const district = shopItemDistrict(item);
      if (!district) continue;
      counts.set(district, (counts.get(district) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([label, count]) => ({ label, count }));
  }, [gridItems]);

  const showDistrictFilters = districtOptions.length > 1;

  useEffect(() => {
    if (!districtFilter) return;
    if (!districtOptions.some((option) => option.label === districtFilter)) {
      setDistrictFilter(null);
    }
  }, [districtFilter, districtOptions]);

  const productCategories = useMemo(() => {
    const categories = new Set<MarketplaceCategory>();
    for (const item of gridItems) {
      if (item.kind === 'product') categories.add(item.product.category);
    }
    return [...categories];
  }, [gridItems]);

  const showProductSearch = gridItems.length >= 8 || productQuery.length > 0;

  const filteredItems = useMemo(() => {
    let items = gridItems;
    if (filter === 'products') items = items.filter((item) => item.kind === 'product');
    else if (filter === 'hotels') items = items.filter((item) => item.kind === 'hotel');
    if (districtFilter) {
      items = items.filter((item) => shopItemDistrict(item) === districtFilter);
    }
    if (categoryFilter) {
      items = items.filter((item) => item.kind === 'product' && item.product.category === categoryFilter);
    }
    const q = productQuery.trim().toLocaleLowerCase('tr');
    if (q) {
      items = items.filter((item) => {
        if (item.kind === 'product') {
          return (
            item.product.title.toLocaleLowerCase('tr').includes(q) ||
            (item.product.description ?? '').toLocaleLowerCase('tr').includes(q) ||
            item.product.tags.some((tag) => tag.toLocaleLowerCase('tr').includes(q))
          );
        }
        return (
          item.hotel.name.toLocaleLowerCase('tr').includes(q) ||
          (item.hotel.district ?? '').toLocaleLowerCase('tr').includes(q)
        );
      });
    }
    return items;
  }, [categoryFilter, districtFilter, filter, gridItems, productQuery]);

  const highlightItems = useMemo(() => gridItems.slice(0, 3), [gridItems]);
  const showHighlight =
    highlightItems.length >= 2 && !productQuery.trim() && !categoryFilter && !districtFilter && filter === 'all';

  const listItems = useMemo(() => {
    if (!showHighlight) return filteredItems;
    const featuredIds = new Set(highlightItems.map((item) => item.id));
    return filteredItems.filter((item) => !featuredIds.has(item.id));
  }, [filteredItems, highlightItems, showHighlight]);

  const galleryUrls = useMemo(
    () => (snapshot ? buildShopGalleryUrls(snapshot.business, snapshot.products) : []),
    [snapshot],
  );

  const hotelRating = useMemo(() => aggregateHotelRating(snapshot?.hotels ?? []), [snapshot?.hotels]);

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (!snapshot) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="storefront-outline" size={36} color={colors.textMuted} />
            <Text variant="label">Mağaza bulunamadı</Text>
            <Text secondary variant="caption" style={{ textAlign: 'center' }}>
              Bu işletmenin mağazası henüz yayında değil veya erişilemiyor.
            </Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const { business } = snapshot;
  const coverUri = business.coverUrl;

  const sendMessage = async () => {
    if (!(await requireAuth('Mesaj')) || !business.ownerId) return;
    const { conversationId, error: msgError } = await getOrCreateDirectConversation(business.ownerId);
    if (msgError) {
      Alert.alert('Mesaj', msgError);
      return;
    }
    if (conversationId) openChat(conversationId);
  };

  const openBusinessProfile = () => {
    router.push(`/detail/businesses/${business.id}?fromShop=1` as never);
  };

  const openMaps = () => {
    void openBusinessShopDirections(business);
  };

  const mapsAvailable =
    (business.latitude != null && business.longitude != null) ||
    Boolean(business.address?.trim() || business.district?.trim());

  const shareShop = () => {
    void shareBusinessShop({
      id: business.id,
      name: business.name,
      shopTagline: business.shopTagline,
      district: business.district,
      commerceModeLabel: COMMERCE_MODE_LABELS[business.commerceMode],
    });
  };

  const toggleFavorite = async () => {
    if (!(await requireAuth('Mağaza kaydet'))) return;
    const result = await toggleShopFavorite(user!.id, business.id);
    if (result.error) {
      Alert.alert('Kaydet', result.error);
      return;
    }
    setIsFavorite(result.saved);
  };

  const quickActions: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] =
    [];

  if (business.phone) {
    quickActions.push({
      key: 'phone',
      icon: 'call-outline',
      label: 'Ara',
      onPress: () => void openUrl(`tel:${business.phone}`),
    });
  }

  if (mapsAvailable) {
    quickActions.push({
      key: 'maps',
      icon: 'navigate-outline',
      label: 'Yol tarifi',
      onPress: openMaps,
    });
  }

  if (business.website) {
    quickActions.push({
      key: 'web',
      icon: 'globe-outline',
      label: 'Web',
      onPress: () => void openUrl(business.website!),
    });
  }

  if (!isOwner && business.ownerId) {
    quickActions.push({
      key: 'message',
      icon: 'chatbubble-outline',
      label: 'Mesaj',
      onPress: () => void sendMessage(),
    });
  }

  quickActions.push({
    key: 'contact',
    icon: 'information-circle-outline',
    label: 'İletişim',
    onPress: openBusinessProfile,
  });

  const showShowcasePanel =
    commerceModeIsShowcase(business.commerceMode) || gridItems.length === 0;

  return (
    <GradientBackground>
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
            <View style={[styles.heroWrap, { marginHorizontal: -spacing.lg }]}>
              <View style={styles.coverWrap}>
                {coverUri ? (
                  <>
                    <Pressable onPress={() => openShopMedia(true)} style={styles.coverPressable}>
                      <OptimizedImage
                        uri={coverUri}
                        style={styles.coverImage}
                        tier="full"
                        contentFit="cover"
                        recyclingKey={`shop-cover-${business.id}`}
                      />
                    </Pressable>
                    <LinearGradient
                      colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', `${colors.background}F0`]}
                      locations={[0, 0.55, 1]}
                      style={styles.coverFade}
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <LinearGradient
                    colors={
                      isDark
                        ? ([`${accent}70`, `${accent}35`, colors.background] as const)
                        : ([`${accent}95`, `${accent}50`, colors.surfaceElevated] as const)
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.coverFallback}
                  >
                    <Ionicons name="storefront" size={96} color={`${accent}28`} style={styles.coverPattern} />
                  </LinearGradient>
                )}

                <View style={[styles.heroTopBar, { paddingTop: insets.top + spacing.xs }]}>
                  <Pressable
                    onPress={() => router.back()}
                    style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
                  >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                  </Pressable>
                  <View style={styles.heroTopActions}>
                    <Pressable
                      accessibilityLabel="Mağazayı paylaş"
                      onPress={shareShop}
                      style={[styles.iconBtn, { backgroundColor: `${colors.background}CC` }]}
                    >
                      <Ionicons name="share-outline" size={20} color={colors.text} />
                    </Pressable>
                  </View>
                </View>

                <Animated.View
                  entering={FadeInUp.delay(100).duration(420).springify().damping(18)}
                  style={styles.logoOverlay}
                >
                  <Pressable
                    onPress={() => openShopMedia(false)}
                    disabled={!business.logoUrl}
                    style={[styles.logoShell, { borderColor: colors.background, backgroundColor: colors.background }]}
                  >
                    <View
                      style={[
                        styles.logoInner,
                        { borderColor: `${accent}20`, backgroundColor: colors.surface },
                      ]}
                    >
                      {business.logoUrl ? (
                        <Image source={{ uri: business.logoUrl }} style={styles.logo} resizeMode="cover" />
                      ) : (
                        <View style={styles.logoPlaceholderInner}>
                          <Ionicons name="storefront" size={28} color={accent} />
                        </View>
                      )}
                    </View>
                    {business.logoUrl ? (
                      <View style={[styles.logoExpandBtn, { backgroundColor: `${colors.background}E6` }]}>
                        <Ionicons name="expand-outline" size={13} color={colors.text} />
                      </View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              </View>

              <Animated.View
                entering={FadeInUp.delay(160).duration(440).springify().damping(18)}
                style={styles.heroBody}
              >
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: `${accent}18` }]}>
                    <Ionicons name="bag-handle-outline" size={11} color={accent} />
                    <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                      {COMMERCE_MODE_LABELS[business.commerceMode]}
                    </Text>
                  </View>
                  {business.isVerified ? (
                    <View style={[styles.chip, { backgroundColor: 'rgba(255,179,0,0.14)' }]}>
                      <BusinessVerifiedTick size={12} />
                      <Text variant="caption" style={{ color: '#FFB300', fontWeight: '700' }}>
                        Doğrulanmış
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.nameRow}>
                  <Text variant="h2" style={styles.businessName} numberOfLines={2}>
                    {business.name}
                  </Text>
                  {business.isVerified ? <BusinessVerifiedTick size={20} /> : null}
                </View>

                <Text secondary variant="caption" style={styles.tagline}>
                  {business.shopTagline ?? 'Kurumsal mağaza vitrini'}
                </Text>

                {business.district ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={13} color={accent} />
                    <Text secondary variant="caption">
                      {business.district}
                    </Text>
                  </View>
                ) : null}

                <BusinessShopTrustBar
                  category={business.category}
                  viewCount={displayViewCount}
                  itemCount={gridItems.length}
                  isVerified={business.isVerified}
                  hotelRating={hotelRating}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => void toggleFavorite()}
                  favoriteDisabled={!user}
                />
              </Animated.View>
            </View>

            {isOwner ? (
              <Animated.View entering={FadeInUp.delay(200).duration(400).springify().damping(18)}>
                <BusinessShopOwnerBar
                  businessId={business.id}
                  shopPublished={business.shopPublished}
                  accent={accent}
                  showProducts={commerceModeShowsProducts(business.commerceMode)}
                />
              </Animated.View>
            ) : null}

            {quickActions.length > 0 ? (
              <Animated.View entering={FadeInUp.delay(220).duration(400).springify().damping(18)} style={styles.quickRow}>
                {quickActions.map((action) => (
                  <QuickAction
                    key={action.key}
                    icon={action.icon}
                    label={action.label}
                    accent={accent}
                    onPress={action.onPress}
                  />
                ))}
              </Animated.View>
            ) : null}

            {business.description ? (
              <Animated.View entering={FadeInUp.delay(260).duration(400).springify().damping(18)}>
                <GlassCard padded style={{ gap: spacing.xs }}>
                  <Text variant="label">Hakkında</Text>
                  <Text secondary style={styles.about}>
                    {business.description}
                  </Text>
                </GlassCard>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(280).duration(400).springify().damping(18)}>
              <BusinessShopActivityStrip
                campaigns={shopContext.campaigns}
                events={shopContext.events}
                jobs={shopContext.jobs}
                accent={accent}
                onOpenProfile={openBusinessProfile}
              />
            </Animated.View>

            {showShowcasePanel ? (
              <Animated.View entering={FadeInUp.delay(290).duration(400).springify().damping(18)}>
                <BusinessShopShowcasePanel
                  business={business}
                  galleryUrls={galleryUrls}
                  accent={accent}
                  onOpenMaps={openMaps}
                  onMessage={() => void sendMessage()}
                  onOpenWeb={() => business.website && void openUrl(business.website)}
                  onOpenGallery={(index) => setViewerUrls(galleryUrls.slice(index))}
                  mapsDisabled={!mapsAvailable}
                  webDisabled={!business.website}
                />
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(300).duration(400).springify().damping(18)} style={styles.showcaseHead}>
              <BusinessShopSectionHeader
                itemCount={listItems.length}
                accent={accent}
                showLive={business.shopPublished}
              />
            </Animated.View>

            {showHighlight ? (
              <Animated.View entering={FadeInUp.delay(310).duration(400).springify().damping(18)}>
                <BusinessShopHighlightCarousel items={highlightItems} accent={accent} />
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(320).duration(400).springify().damping(18)}>
              <BusinessShopProductFilters
                query={productQuery}
                onQueryChange={setProductQuery}
                categories={productCategories}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                accent={accent}
                showSearch={showProductSearch}
              />
            </Animated.View>

            {showDistrictFilters ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.districtFilterRow}
              >
                <FilterChip
                  label={`Tüm konumlar · ${gridItems.length}`}
                  active={districtFilter === null}
                  accent={accent}
                  onPress={() => setDistrictFilter(null)}
                />
                {districtOptions.map((option) => (
                  <FilterChip
                    key={option.label}
                    label={`${option.label} · ${option.count}`}
                    active={districtFilter === option.label}
                    accent={accent}
                    onPress={() => setDistrictFilter(option.label)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {showFilters ? (
              <View style={styles.filterRow}>
                <FilterChip
                  label={`Tümü · ${gridItems.length}`}
                  active={filter === 'all'}
                  accent={accent}
                  onPress={() => setFilter('all')}
                />
                <FilterChip
                  label={`Ürünler · ${productCount}`}
                  active={filter === 'products'}
                  accent={accent}
                  onPress={() => setFilter('products')}
                />
                <FilterChip
                  label={`Oteller · ${hotelCount}`}
                  active={filter === 'hotels'}
                  accent={accent}
                  onPress={() => setFilter('hotels')}
                />
              </View>
            ) : null}
          </Animated.View>
        }
        ListEmptyComponent={
          listItems.length === 0 && (productQuery.trim().length > 0 || !showShowcasePanel) ? (
          <GlassCard style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: `${accent}14` }]}>
              <Ionicons name="bag-handle-outline" size={32} color={accent} />
            </View>
            <Text variant="label">Henüz vitrin öğesi yok</Text>
            <Text secondary variant="caption" style={{ textAlign: 'center' }}>
              {productQuery.trim()
                ? 'Aramanıza uygun vitrin öğesi bulunamadı.'
                : districtFilter
                ? `${districtFilter} konumunda yayınlanmış ürün veya otel bulunamadı.`
                : filter === 'products'
                  ? 'Bu mağazada henüz ürün eklenmemiş.'
                  : filter === 'hotels'
                    ? 'Bu mağazada henüz otel eklenmemiş.'
                    : commerceModeIsShowcase(business.commerceMode)
                      ? 'Kurumsal vitrininiz hazır. İletişim ve tanıtım bilgileriniz ziyaretçilere görünür.'
                      : 'Bu işletmenin vitrininde henüz ürün veya otel yok.'}
            </Text>
            {isOwner && commerceModeIsShowcase(business.commerceMode) ? (
              <Pressable
                onPress={() => router.push(BUSINESS_ROUTES.shopCurate as never)}
                style={({ pressed }) => [
                  styles.emptyCta,
                  { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="grid-outline" size={18} color="#fff" />
                <Text variant="caption" style={styles.emptyCtaText}>
                  Vitrini düzenle
                </Text>
              </Pressable>
            ) : null}
            {isOwner && commerceModeShowsProducts(business.commerceMode) && filter !== 'hotels' ? (
              <Pressable
                onPress={() => router.push(BUSINESS_ROUTES.createProduct as never)}
                style={({ pressed }) => [
                  styles.emptyCta,
                  { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text variant="caption" style={styles.emptyCtaText}>
                  İlk ürünü ekle
                </Text>
              </Pressable>
            ) : null}
          </GlassCard>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInUp.delay(Math.min(index * 50, 300)).duration(380).springify().damping(20)}
            style={styles.cell}
          >
            {item.kind === 'product' ? (
              <BusinessShopProductCard product={item.product} accent={accent} />
            ) : (
              <BusinessShopHotelCard hotel={item.hotel} accent={accent} />
            )}
          </Animated.View>
        )}
      />

      <FullScreenMediaViewer
        urls={viewerUrls}
        visible={viewerUrls.length > 0}
        onClose={() => setViewerUrls([])}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { gap: spacing.md, marginBottom: spacing.md },
  heroWrap: { gap: spacing.sm },
  coverWrap: { height: 240, position: 'relative' },
  coverPressable: { ...StyleSheet.absoluteFillObject },
  coverImage: { ...StyleSheet.absoluteFillObject },
  coverFade: { ...StyleSheet.absoluteFillObject },
  coverFallback: { flex: 1, overflow: 'hidden' },
  coverPattern: { position: 'absolute', right: -12, bottom: -16 },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroTopActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoOverlay: {
    position: 'absolute',
    left: spacing.lg,
    bottom: -28,
    zIndex: 3,
  },
  logoShell: {
    borderRadius: radius.xl,
    borderWidth: 3,
    padding: 2,
    position: 'relative',
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholderInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoExpandBtn: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    paddingTop: spacing.xl + spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  businessName: { flexShrink: 1, fontWeight: '900' },
  tagline: { fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  about: { lineHeight: 22 },
  showcaseHead: { gap: 4, marginTop: spacing.xs },
  districtFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  row: { gap: spacing.sm },
  cell: { flex: 1, maxWidth: '50%' },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    marginTop: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  emptyCtaText: { color: '#fff', fontWeight: '800' },
});
