import { Platform, type FlatListProps } from 'react-native';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/** Android tablet — ek GPU/bellek kısıtı (video önbelleği vb.). */
export function isAndroidLowPerfDevice(): boolean {
  return isAndroid() && isAndroidTablet();
}

/** Tablet: erteleme yok — tıklama ve sayfa geçişi anında. */
export function shouldRunUiWorkImmediately(): boolean {
  return isAndroidTablet();
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

/** Sekme odaklanınca ağır işleri ertele — ana liste önce çizilsin. */
export function shouldDeferHeavyFocusWork(): boolean {
  return isAndroid();
}

/** Akış üstü carousel — ana feed listesi önce etkileşilebilir olsun. */
export function shouldDeferFeedHeaderContent(): boolean {
  return isAndroid();
}

/** Reels sekmesinde hafif tab bar — tüm Android. */
export function shouldUseLightReelsTabBar(): boolean {
  return isAndroid();
}

export function getAndroidTabBarElevation(): number {
  return isAndroid() ? 4 : 8;
}

export function getReelsVideoCacheBytes(): number {
  // iOS: 384 MB bellek baskısı/OS kill riski yaratıyordu; 192 MB hâlâ akıcı oynatma için yeterli.
  if (!isAndroid()) return 192 * 1024 * 1024;
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
  initialNumToRender: 3,
  maxToRenderPerBatch: 2,
  windowSize: 4,
  updateCellsBatchingPeriod: 100,
  removeClippedSubviews: true,
};

const ANDROID_TABLET_FLAT_LIST_PERF: ListPerfProps = {
  initialNumToRender: 3,
  maxToRenderPerBatch: 2,
  windowSize: 3,
  updateCellsBatchingPeriod: 50,
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
  return isAndroidTablet() ? 380 : isAndroid() ? 420 : 460;
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

/** Android: akış + profil eager — profil sık kullanılır, ilk tıklamada ağır mount gecikmesi olmasın. */
const ANDROID_EAGER_TAB_NAMES = new Set(['index', 'profile']);

function shouldEagerMountAndroidTab(tabName: string): boolean {
  if (!isAndroid()) return tabName === 'index';
  return ANDROID_EAGER_TAB_NAMES.has(tabName);
}

export function getAndroidTabLazyOption(
  tabName: string,
): { lazy: boolean; lazyPlaceholder?: () => null } {
  if (shouldEagerMountAndroidTab(tabName)) {
    return { lazy: false };
  }
  return {
    lazy: true,
    lazyPlaceholder: () => null,
  };
}

/** Pasif sekmeleri bellekten ayır — iOS'ta harita/video arka planda ısınmayı azaltır. */
export function shouldDetachInactiveTabScreens(): boolean {
  return Platform.OS === 'ios';
}

export { getHeavyFeatureBootDelayMs as getAndroidHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';

/** Profil ızgarası sütun sayısı — tablette daha küçük hücre, daha az decode. */
export function getProfileGridColumns(): number {
  return isAndroidTablet() ? 5 : 3;
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
      thumb: 160,
      feed: 900,
      grid: 220,
      avatar: 128,
      full: 1400,
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
  return isAndroidTablet() ? 15 : 24;
}

export function getProfileGridLoadMoreBatch(): number {
  return isAndroidTablet() ? 12 : 18;
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
  | { delayPressIn: number; android_disableSound: true }
  | Record<string, never> {
  if (!isAndroid()) return {};
  return {
    delayPressIn: 0,
    android_disableSound: true,
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

/** Sohbet artımlı senkron — realtime yedek; iOS'ta agresif poll ısıtıyordu. */
export function getChatPollIntervalMs(): number {
  if (!isAndroid()) return 18_000;
  return isAndroidTablet() ? 2_500 : 2_000;
}

/** Okundu işareti periyodik güncelleme. */
export function getChatReadMarkIntervalMs(): number {
  return isAndroid() ? 45_000 : 20_000;
}

/** Sohbet balonu giriş animasyonu — Android scroll için kapalı. */
export function shouldAnimateChatBubbles(): boolean {
  return !isAndroid();
}

/** Sohbet ilk render satır sayısı. */
export function getChatInitialRenderCount(): number {
  if (isAndroidTablet()) return 8;
  if (isAndroid()) return 10;
  return 18;
}

/** Keşfet FlashList draw mesafesi. */
export function getDiscoveryEstimatedItemSize(): number {
  return isAndroidTablet() ? 320 : isAndroid() ? 360 : 400;
}

/** Reels arka plan HLS ısıtma — iOS'ta daha seyrek batch. */
export function getReelSequentialWarmupMs(defaultMs: number): number {
  if (Platform.OS === 'ios') return Math.max(defaultMs, 120);
  return defaultMs;
}

/** Reels sıralı ısıtma batch boyutu. */
export function getReelWarmupBatchSize(): number {
  return Platform.OS === 'ios' ? 1 : 2;
}

/** Konum yayın aralığı (watchPositionAsync timeInterval). */
export function getProximityPresenceIntervalMs(defaultMs: number): number {
  if (Platform.OS === 'ios') return Math.max(defaultMs, 20_000);
  return isAndroidTablet() ? 20_000 : 25_000;
}

/** Yakınlık aday poll — pil/ısı için seyrek aralık. */
export function getProximityCandidatePollMs(defaultMs: number): number {
  if (Platform.OS === 'ios') return Math.max(defaultMs, 18_000);
  return isAndroidTablet() ? 15_000 : 20_000;
}

/** Aktif reel oynatma sağlık kontrolü aralığı (ms). */
export function getReelPlaybackHealthCheckMs(): number {
  return Platform.OS === 'ios' ? 2_000 : 1_500;
}
