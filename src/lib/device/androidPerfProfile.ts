import { Platform, type FlatListProps } from 'react-native';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { MAIN_TAB_SWIPE_ROUTES, type MainTabRoute } from '@/features/navigation/constants';

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/** Android tablet — ek GPU/bellek kısıtı (video önbelleği vb.). */
export function isAndroidLowPerfDevice(): boolean {
  return isAndroid() && isAndroidTablet();
}

/** Arka plan fetch'leri rAF ile ertele — tablet dahil (anında çalıştırmak JS spike yapıyordu). */
export function shouldRunUiWorkImmediately(): boolean {
  return false;
}

/** Android: gradient/blur yerine düz arka plan — tablet GPU yükünü azaltır. */
export function shouldUsePlainScreenBackground(): boolean {
  return isAndroid();
}

/** BlurView sürekli GPU yükü — düz cam yüzey kullan (iOS + Android). */
export function shouldSkipUiBlur(): boolean {
  return true;
}

/** freezeOnBlur + enableFreeze Android'de sekme tıklamasını geciktirir. */
export function shouldUseScreenFreeze(): boolean {
  return !isAndroid();
}

/** Üst carousel / öne çıkan profiller — tablette gecikmeli. */
export function shouldDeferFeedRichHeader(): boolean {
  return isAndroidTablet();
}

/** Üst zengin header gecikmesi (ms). */
export function getFeedRichHeaderDelayMs(): number {
  return isAndroidTablet() ? 3_500 : 0;
}

/** Tablet: spotlight carousel (etkinlik/kayıp) — ilk açılışta atla. */
export function shouldLoadFeedSpotlightCarousel(): boolean {
  return !isAndroidTablet();
}

/** Tablet: öne çıkan profiller şeridi — ilk açılışta atla. */
export function shouldLoadFeedFeaturedProfiles(): boolean {
  return !isAndroidTablet();
}

/** Mux işleniyor poll — tablette kapalı. */
export function shouldPollFeedProcessingVideos(): boolean {
  return !isAndroidTablet();
}

/** Hikâye halkası mount gecikmesi (ms). */
export function getStoryRingMountDelayMs(): number {
  if (isAndroidTablet()) return 4_500;
  if (isAndroid()) return 1_200;
  return 0;
}

/** Akış sayfa boyutu ve sıralama havuzu. */
export function getFeedFetchLimits(): { pageSize: number; rankPoolMultiplier: number } {
  if (isAndroidTablet()) return { pageSize: 8, rankPoolMultiplier: 2 };
  if (isAndroid()) return { pageSize: 12, rankPoolMultiplier: 2.5 };
  return { pageSize: 15, rankPoolMultiplier: 3 };
}

/** Feed realtime — tablette yalnızca sekme odaktayken (hook'ta). */
export function shouldUseFeedRealtime(): boolean {
  return !isAndroidTablet();
}

/** Reels / inbox odak işlerini ertele. */
export function shouldDeferHeavyFocusWork(): boolean {
  return isAndroid();
}

/** Mux işleniyor poll aralığı çarpanı (tablet). */
export function getFeedProcessingVideoPollMultiplier(): number {
  return isAndroidTablet() ? 2.5 : 1;
}

/** Drawer açılış süresi (ms) — 0 = anında. */
export function getFeedDrawerOpenDurationMs(): number {
  return isAndroidTablet() ? 0 : 280;
}

/** Drawer kapanış süresi (ms). */
export function getFeedDrawerCloseDurationMs(): number {
  return isAndroidTablet() ? 0 : 240;
}

/** Akış üstü carousel — tablet dahil ertelenir, liste önce etkileşilebilir. */
export function shouldDeferFeedHeaderContent(): boolean {
  return isAndroid();
}

/** Hikâye halkası — akış mount olduktan sonra. */
export function shouldDeferStoryRingBar(): boolean {
  return isAndroidTablet();
}

/** Akışta video otomatik oynatma — tablette kapalı (thumbnail). */
export function shouldAutoplayFeedVideos(): boolean {
  return !isAndroidTablet();
}

/** Mesaj modülü ön-ısıtma — tablette atla. */
export function shouldWarmupAndroidTabModules(): boolean {
  return isAndroid() && !isAndroidTablet();
}

/** Feed TabSwipeShell — tablette tamamen kapalı (drawer menüden). */
export function shouldUseFeedTabSwipeShell(): boolean {
  return isAndroid() && !isAndroidTablet();
}

/** FlashList drawDistance çarpanı (tahmini satır yüksekliği ×). */
export function getFeedFlashListDrawDistance(): number {
  const item = getFeedEstimatedItemSize();
  return isAndroidTablet() ? Math.round(item * 0.75) : item * 2;
}

/** Feed scroll durduktan sonra video seçimi gecikmesi. */
export function getFeedScrollSettleMs(): number {
  return isAndroidTablet() ? 200 : 120;
}

/** Reels sekmesinde hafif tab bar — tüm Android. */
export function shouldUseLightReelsTabBar(): boolean {
  return isAndroid();
}

export function getAndroidTabBarElevation(): number {
  return isAndroid() ? 4 : 8;
}

export function getReelsVideoCacheBytes(): number {
  if (!isAndroid()) return 192 * 1024 * 1024;
  if (isAndroidTablet()) return 48 * 1024 * 1024;
  return 96 * 1024 * 1024;
}

type ListPerfProps = Partial<
  Pick<
    FlatListProps<unknown>,
    | 'initialNumToRender'
    | 'maxToRenderPerBatch'
    | 'windowSize'
    | 'updateCellsBatchingPeriod'
    | 'removeClippedSubviews'
  >
>;

const ANDROID_FLAT_LIST_PERF: ListPerfProps = {
  initialNumToRender: 4,
  maxToRenderPerBatch: 3,
  windowSize: 5,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
};

/** Tablet: dar pencere — minimum eşzamanlı mount. */
const ANDROID_TABLET_FLAT_LIST_PERF: ListPerfProps = {
  initialNumToRender: 1,
  maxToRenderPerBatch: 1,
  windowSize: 2,
  updateCellsBatchingPeriod: 100,
  removeClippedSubviews: true,
};

const ANDROID_REELS_FLAT_LIST_PERF: ListPerfProps = {
  initialNumToRender: 1,
  maxToRenderPerBatch: 1,
  windowSize: 3,
  updateCellsBatchingPeriod: 100,
  removeClippedSubviews: true,
};

// iOS feed: varsayılan windowSize (21) çok geniş — uzun feed'de onlarca kart +
// görsel/video aynı anda mount olup ısınmaya yol açıyor. Pencereyi daralt.
// removeClippedSubviews iOS'ta boş hücre bug'ı yapabildiği için kapalı bırakıldı.
const IOS_FEED_FLAT_LIST_PERF: ListPerfProps = {
  initialNumToRender: 4,
  maxToRenderPerBatch: 4,
  windowSize: 7,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: false,
};

/** FlashList / FlatList tahmini satır yüksekliği — akış kartları. */
export function getFeedEstimatedItemSize(): number {
  return isAndroidTablet() ? 280 : isAndroid() ? 420 : 460;
}

/** Akış inline medya üst sınırı (px). */
export function getFeedMediaMaxHeight(): number {
  return isAndroidTablet() ? 340 : 420;
}

export function getAndroidFlatListPerfProps(): ListPerfProps {
  if (!isAndroid()) return {};
  return isAndroidTablet() ? ANDROID_TABLET_FLAT_LIST_PERF : ANDROID_FLAT_LIST_PERF;
}

/** Ana akış listesi perf prop'ları — Android FlashList + iOS FlatList penceresi. */
export function getFeedListPerfProps(): ListPerfProps {
  if (isAndroid()) {
    return isAndroidTablet() ? ANDROID_TABLET_FLAT_LIST_PERF : ANDROID_FLAT_LIST_PERF;
  }
  return IOS_FEED_FLAT_LIST_PERF;
}

export function getAndroidReelsFlatListPerfProps(): ListPerfProps {
  return isAndroid() ? ANDROID_REELS_FLAT_LIST_PERF : {};
}

type AndroidTabScreenOptions =
  | {
      freezeOnBlur: false;
      animation: 'none';
      transitionSpec: {
        animation: 'timing';
        config: { duration: number };
      };
    }
  | Record<string, never>;

/** Tüm Android: animasyon yok, freeze yok — iOS benzeri anında sekme geçişi. */
export function getAndroidTabScreenOptions(): AndroidTabScreenOptions {
  if (!isAndroid()) return {};

  return {
    freezeOnBlur: false,
    animation: 'none',
    transitionSpec: {
      animation: 'timing',
      config: { duration: 0 },
    },
  };
}

/** Android: tabBarBackground bileşeni yerine düz renk — tıklama daha hızlı. */
export function shouldUseSolidAndroidTabBar(): boolean {
  return isAndroid();
}

/** Android: boot splash görseli gösterme — feed anında etkileşilebilir. */
export function shouldShowBootSplashVisual(): boolean {
  return !isAndroid();
}

/** Android telefon: ana tab bar sekmeleri eager — ilk tıklamada remount/lazy yok. */
const ANDROID_EAGER_TAB_NAMES = new Set(['index', 'discover', 'messages', 'reels', 'profile']);

/** Android tablet: yalnızca akış eager — profil/keşfet lazy (bellek). */
const ANDROID_TABLET_EAGER_TAB_NAMES = new Set(['index']);

function shouldEagerMountAndroidTab(tabName: string): boolean {
  if (!isAndroid()) return tabName === 'index';
  if (isAndroidTablet()) return ANDROID_TABLET_EAGER_TAB_NAMES.has(tabName);
  return ANDROID_EAGER_TAB_NAMES.has(tabName);
}

/** iOS swipe komşuları: yalnızca akış + keşfet eager. Reels/Mesaj/Profil lazy (ilk açılış placeholder). */
const IOS_SWIPE_EAGER_TAB_NAMES = new Set(['index', 'discover']);

function shouldEagerMountTabForSwipe(tabName: string): boolean {
  if (!MAIN_TAB_SWIPE_ROUTES.has(tabName as MainTabRoute)) {
    return shouldEagerMountAndroidTab(tabName);
  }
  if (!isAndroid()) {
    return IOS_SWIPE_EAGER_TAB_NAMES.has(tabName);
  }
  if (isAndroidTablet()) {
    return tabName === 'index';
  }
  return tabName === 'index' || tabName === 'discover' || ANDROID_EAGER_TAB_NAMES.has(tabName);
}

export function getAndroidTabLazyOption(
  tabName: string,
): { lazy: boolean } {
  if (shouldEagerMountTabForSwipe(tabName)) {
    return { lazy: false };
  }
  return { lazy: true };
}

/** Pasif sekmeleri bellekten ayır.
 * Android'de true = her sekme tıklamasında remount → belirgin gecikme.
 * iOS swipe komşuları için zaten false.
 */
export function shouldDetachInactiveTabScreens(): boolean {
  if (isAndroid()) return false;
  if (shouldUseMainTabSwipeGesture()) return false;
  return true;
}

/** Inbox açılışında AsyncStorage mesaj hydrate üst sınırı. */
export function getInboxDiskHydrateLimit(): number {
  if (isAndroidTablet()) return 4;
  if (isAndroid()) return 8;
  return 12;
}

/** Sohbet odası ilk ağ sayfası — Android'de daha küçük = daha hızlı ilk boya. */
export function getChatOpenPageSize(): number {
  if (isAndroidTablet()) return 24;
  if (isAndroid()) return 28;
  return 50;
}

/** Reels sekmesinden çıkınca video/müzik havuzu serbest bırakma (ms). */
export function getReelsIdleReleaseMs(): number {
  if (isAndroidTablet()) return 6_000;
  if (isAndroid()) return 8_000;
  return 20_000;
}

export { getHeavyFeatureBootDelayMs as getAndroidHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';

/** Profil ızgarası sütun sayısı — tablette daha küçük hücre, daha az decode. */
export function getProfileGridColumns(): number {
  return isAndroidTablet() ? 4 : 3;
}

/** Marketplace ızgarası — tablette 3 sütun, daha küçük kapak görselleri. */
export function getMarketplaceGridColumns(): number {
  return isAndroidTablet() ? 3 : 2;
}

export type ImageSizeTier = 'thumb' | 'feed' | 'grid' | 'avatar' | 'full';

/** CDN/transform hedef genişlik (layout px, cihaz DPI ayrı). */
export function getImageTargetWidth(tier: ImageSizeTier): number {
  if (isAndroidTablet()) {
    const tablet: Record<ImageSizeTier, number> = {
      thumb: 80,
      feed: 460,
      grid: 128,
      avatar: 72,
      full: 680,
    };
    return tablet[tier];
  }
  if (isAndroid()) {
    const phone: Record<ImageSizeTier, number> = {
      thumb: 120,
      feed: 720,
      grid: 180,
      avatar: 96,
      full: 1200,
    };
    return phone[tier];
  }
  const ios: Record<ImageSizeTier, number> = {
    thumb: 140,
    feed: 800,
    grid: 200,
    avatar: 112,
    full: 1400,
  };
  return ios[tier];
}

/** Profil ızgarası ilk render — ScrollView içinde kademeli yükleme. */
export function getProfileGridInitialBatch(): number {
  return isAndroidTablet() ? 6 : 24;
}

export function getProfileGridLoadMoreBatch(): number {
  return isAndroidTablet() ? 6 : 18;
}

/** Supabase render kalitesi (0–100). */
export function getImageRenderQuality(): number {
  return isAndroidTablet() ? 62 : 78;
}

/** Decode üst sınırı (layout px × DPI). */
export function getImageMaxDecodeWidth(): number {
  return isAndroidTablet() ? 640 : 1200;
}

/** Boot splash minimum süresi — tüm platformlarda sıfır. */
export function getAndroidBootSplashMs(_defaultMs: number): number {
  return 0;
}

export function getAndroidBootPaintTimeoutMs(defaultMs: number): number {
  return Math.min(defaultMs, 80);
}

export function getAndroidBootForceNavMs(defaultMs: number): number {
  return defaultMs;
}

export function getAndroidGuestBootTimeoutMs(): number {
  return isAndroid() ? 350 : 500;
}

export function getAndroidAuthBootstrapTimeoutMs(): number {
  if (isAndroidTablet()) return 1_200;
  return isAndroid() ? 1_800 : 3_000;
}

/** İlk oturum okuması — SecureStore bekleme üst sınırı. */
export function getAndroidInitialAuthSessionTimeoutMs(): number {
  return isAndroidTablet() ? 900 : 700;
}

export function shouldDismissBootOverlayImmediately(): boolean {
  return true;
}

/** Boot overlay dokunmayı bloklamasın — auth beklerken bile etkileşim geçsin. */
export function shouldBootOverlayBlockTouches(): boolean {
  return !isAndroid();
}

/** Ana sekme yatay kaydırma — Android'de Pan jesti tıklamaları geciktirir. */
export function shouldUseMainTabSwipeGesture(): boolean {
  return !isAndroid();
}

/** Android: dokunma gecikmesi ve sistem sesi kapalı — anında tepki. */
export function getAndroidInstantPressableProps():
  | {
      delayPressIn: number;
      unstable_pressDelay: number;
      android_disableSound: true;
      android_ripple: null;
    }
  | Record<string, never> {
  if (!isAndroid()) return {};
  return {
    delayPressIn: 0,
    unstable_pressDelay: 0,
    android_disableSound: true,
    // Ripple animasyonu tıklama hissini geciktirir — tab/aksiyonlarda kapalı.
    android_ripple: null,
  };
}

/** Android: Modal/sheet açılışı animasyonsuz. */
export function resolveModalAnimationType(
  fallback: 'none' | 'slide' | 'fade' = 'slide',
): 'none' | 'slide' | 'fade' {
  return isAndroid() ? 'none' : fallback;
}

/** Ardışık navigasyon kilidi — tablette minimum. */
export function getNavigationRepeatGuardMs(): number {
  if (isAndroidTablet()) return 80;
  if (isAndroid()) return 100;
  return 600;
}

/** Bildirimden yönlendirme flush gecikmesi. */
export function getNotificationNavFlushMs(defaultMs: number): number {
  if (isAndroidTablet()) return 0;
  if (isAndroid()) return Math.min(defaultMs, 40);
  return defaultMs;
}

/** Bildirim boot tamamlandıktan sonra flush gecikmesi. */
export function getNotificationBootFlushMs(defaultMs: number): number {
  if (isAndroidTablet()) return 0;
  if (isAndroid()) return Math.min(defaultMs, 120);
  return defaultMs;
}

/** Sohbet artımlı senkron — realtime yedek; sık poll JS thread'i meşgul eder. */
export function getChatPollIntervalMs(): number {
  if (!isAndroid()) return 18_000;
  return isAndroidTablet() ? 18_000 : 8_000;
}

/** Okundu işareti periyodik güncelleme. */
export function getChatReadMarkIntervalMs(): number {
  return isAndroid() ? 45_000 : 20_000;
}

/** Sohbet balonu giriş animasyonu — Android scroll için kapalı. */
export function shouldAnimateChatBubbles(): boolean {
  return !isAndroid();
}

/** Sohbet ilk render satır sayısı — videolu balonlar pahalı; Android'de dar tut. */
export function getChatInitialRenderCount(): number {
  if (isAndroidTablet()) return 8;
  if (isAndroid()) return 10;
  return 18;
}

/** Keşfet FlashList draw mesafesi. */
export function getDiscoveryEstimatedItemSize(): number {
  return isAndroidTablet() ? 280 : isAndroid() ? 360 : 400;
}

/** Reels arka plan HLS ısıtma — iOS'ta daha seyrek batch. */
export function getReelWarmupBatchSize(): number {
  if (isAndroidTablet()) return 1;
  return Platform.OS === 'ios' ? 1 : 2;
}

export function getReelSequentialWarmupMs(defaultMs: number): number {
  if (Platform.OS === 'ios') return Math.max(defaultMs, 120);
  if (isAndroidTablet()) return Math.max(defaultMs, 400);
  return defaultMs;
}

/** Konum yayın aralığı (watchPositionAsync timeInterval). */
export function getProximityPresenceIntervalMs(defaultMs: number): number {
  if (Platform.OS === 'ios') return Math.max(defaultMs, 20_000);
  return isAndroidTablet() ? 45_000 : 25_000;
}

/** Yakınlık aday poll — pil/ısı için seyrek aralık. */
export function getProximityCandidatePollMs(defaultMs: number): number {
  if (Platform.OS === 'ios') return Math.max(defaultMs, 18_000);
  return isAndroidTablet() ? 40_000 : 20_000;
}

/** Aktif reel oynatma sağlık kontrolü aralığı (ms). */
export function getReelPlaybackHealthCheckMs(): number {
  return Platform.OS === 'ios' ? 2_000 : 1_500;
}
