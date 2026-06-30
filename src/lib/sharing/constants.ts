import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/** WhatsApp / sosyal önizleme ve paylaşım linklerinin marka alan adı. */
export const VORA_SHARE_DOMAIN = 'vora.app';

export const VORA_SHARE_BASE_URL_DEFAULT = `https://${VORA_SHARE_DOMAIN}`;

const SHARE_PREVIEW_SUFFIX = '/functions/v1/share-preview';

function readSupabaseUrl(): string {
  return (
    (typeof extra.EXPO_PUBLIC_SUPABASE_URL === 'string' && extra.EXPO_PUBLIC_SUPABASE_URL.trim()) ||
    (typeof process.env.EXPO_PUBLIC_SUPABASE_URL === 'string' && process.env.EXPO_PUBLIC_SUPABASE_URL.trim()) ||
    ''
  );
}

/** Supabase share-preview edge function kökü — paylaşım linkleri buradan çalışır. */
export function resolveSupabaseSharePreviewBase(): string | null {
  const supabaseUrl = readSupabaseUrl();
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, '')}${SHARE_PREVIEW_SUFFIX}`;
}

function resolveDefaultShareBaseUrl(): string {
  return resolveSupabaseSharePreviewBase() ?? VORA_SHARE_BASE_URL_DEFAULT;
}

const configuredShareBase =
  (typeof extra.EXPO_PUBLIC_SHARE_BASE_URL === 'string' && extra.EXPO_PUBLIC_SHARE_BASE_URL.trim()) ||
  (typeof process.env.EXPO_PUBLIC_SHARE_BASE_URL === 'string' && process.env.EXPO_PUBLIC_SHARE_BASE_URL.trim()) ||
  '';

/**
 * Web paylaşım linklerinin kök URL'si.
 * Varsayılan: Supabase share-preview (404 vermez, uygulamaya yönlendirir).
 * Prod'da vora.app yönlendirmesi hazırsa EXPO_PUBLIC_SHARE_BASE_URL=https://vora.app
 */
export const VORA_SHARE_BASE_URL = configuredShareBase || resolveDefaultShareBaseUrl();

export const VORA_APP_SCHEME = 'vora';

export const IOS_APP_STORE_URL =
  (typeof extra.EXPO_PUBLIC_IOS_APP_STORE_URL === 'string' && extra.EXPO_PUBLIC_IOS_APP_STORE_URL.trim()) ||
  'https://apps.apple.com/tr/app/vora-x/id6777120091?l=tr';

export const ANDROID_PLAY_STORE_URL =
  (typeof extra.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL === 'string' &&
    extra.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL.trim()) ||
  'https://play.google.com/store/apps/details?id=com.karadeniz.dijitalagi';

export type ShareContentKind = 'post' | 'reel' | 'profile' | 'verify' | 'marketplace' | 'shop';

export function buildBusinessShopShareUrl(businessId: string): string {
  return `${VORA_SHARE_BASE_URL}/s/${businessId}`;
}

/** Tıklanınca share-preview üzerinden uygulamaya yönlendiren paylaşım linki */
export function buildBusinessShopPublicShareUrl(businessId: string): string {
  return buildBusinessShopShareUrl(businessId);
}

export function buildBusinessShopAndroidIntentUrl(
  businessId: string,
  fallbackHttpsUrl?: string,
): string {
  const fallback = encodeURIComponent(fallbackHttpsUrl ?? buildBusinessShopShareUrl(businessId));
  return `intent://s/${businessId}#Intent;scheme=vora;package=com.karadeniz.dijitalagi;S.browser_fallback_url=${fallback};end`;
}

export function buildBusinessShopDeepLink(businessId: string): string {
  return `${VORA_APP_SCHEME}://s/${businessId}`;
}

/** Kart ve UI'da gösterilecek kısa marka yolu. */
export function formatPostShareDisplayPath(postId: string): string {
  return `${VORA_SHARE_DOMAIN}/p/${postId}`;
}

export function formatBusinessShopShareDisplayPath(businessId: string): string {
  return `${VORA_SHARE_DOMAIN}/s/${businessId}`;
}

export function buildMarketplaceListingShareUrl(listingId: string, buy = false): string {
  const base = `${VORA_SHARE_BASE_URL}/m/${listingId}`;
  return buy ? `${base}?buy=1` : base;
}

export function buildMarketplaceListingDeepLink(listingId: string, buy = false): string {
  const base = `${VORA_APP_SCHEME}://m/${listingId}`;
  return buy ? `${base}?buy=1` : base;
}

export function buildPostShareUrl(postId: string): string {
  return `${VORA_SHARE_BASE_URL}/p/${postId}`;
}

export function buildReelShareUrl(reelId: string): string {
  return `${VORA_SHARE_BASE_URL}/r/${reelId}`;
}

export function buildProfileShareUrl(username: string): string {
  return `${VORA_SHARE_BASE_URL}/u/${encodeURIComponent(username.replace(/^@/, ''))}`;
}

export function buildVerifyShareUrl(trustCode: string): string {
  return `${VORA_SHARE_BASE_URL}/v/${trustCode}`;
}

export function buildShareDeepLink(kind: ShareContentKind, id: string, buy?: boolean): string {
  const segment =
    kind === 'post'
      ? 'p'
      : kind === 'reel'
        ? 'r'
        : kind === 'profile'
          ? 'u'
          : kind === 'marketplace'
            ? 'm'
            : kind === 'shop'
              ? 's'
              : 'v';
  const value = kind === 'profile' ? id.replace(/^@/, '') : id;
  const base = `${VORA_APP_SCHEME}://${segment}/${encodeURIComponent(value)}`;
  return kind === 'marketplace' && buy ? `${base}?buy=1` : base;
}
