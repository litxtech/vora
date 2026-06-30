import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { resolveAppRouteFromShareUrl } from '@/lib/sharing/resolveIncomingShareUrl';
import { devLog, devWarn } from '@/lib/safeLog';

export type OpenUrlOptions = {
  presentationStyle?: WebBrowser.WebBrowserPresentationStyle;
};

const NATIVE_SCHEME_RE =
  /^(tel|mailto|sms|smsto|geo|maps|whatsapp|instagram|twitter|fb|tg|viber|facetime|itms-apps|market|barcelona|vora):/i;

const COMMON_TLD_RE =
  /\.(com|net|org|io|me|tr|co|app|dev|link|xyz|info|biz|edu|gov|tv|shop|store)(\/|$|:|\?|#|\.)/i;

function hasHttpScheme(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function hasExplicitScheme(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url);
}

function hasNativeScheme(url: string): boolean {
  if (NATIVE_SCHEME_RE.test(url)) return true;
  return hasExplicitScheme(url) && !hasHttpScheme(url);
}

function stripLinkSuffix(value: string): string {
  return value
    .trim()
    .replace(/[<>"']+$/g, '')
    .replace(/[),.;!?]+$/g, '')
    .trim();
}

function normalizeTelUri(value: string): string {
  const digits = value.replace(/^tel:/i, '').replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

/** Her türlü link girdisini açılabilir URL'ye çevirir. */
export function normalizeLinkInput(input: string): string {
  const trimmed = stripLinkSuffix(input);
  if (!trimmed) return '';

  if (/^tel:/i.test(trimmed)) return normalizeTelUri(trimmed);
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (hasNativeScheme(trimmed) || hasHttpScheme(trimmed)) return trimmed;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('www.') || COMMON_TLD_RE.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/** @deprecated normalizeLinkInput ile aynı */
export const normalizeWebUrl = normalizeLinkInput;

type LinkOpenMode = 'in_app_web' | 'system';

function resolveOpenMode(url: string): LinkOpenMode {
  if (hasNativeScheme(url)) return 'system';
  if (!hasHttpScheme(url)) return 'system';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'wa.me' || host === 'api.whatsapp.com') return 'system';
    if (host === 'maps.google.com' || host === 'maps.apple.com') return 'system';
    if (host === 'www.google.com' && /^\/maps\b/i.test(parsed.pathname)) return 'system';
    if (host === 'itunes.apple.com' || host === 'apps.apple.com' || host === 'play.google.com') {
      return 'system';
    }
  } catch {
    return 'system';
  }

  return 'in_app_web';
}

async function openWithLinking(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    devWarn('openUrl', 'Linking.openURL failed', { url, error: String(error) });
    return false;
  }
}

async function openWithExpoWebBrowser(url: string, options?: OpenUrlOptions): Promise<boolean> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle:
        options?.presentationStyle ?? WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      showTitle: true,
    });
    return true;
  } catch (error) {
    devWarn('openUrl', 'expo-web-browser failed', { url, error: String(error) });
    return false;
  }
}

async function openHttpInApp(url: string, options?: OpenUrlOptions): Promise<boolean> {
  if (await openWithExpoWebBrowser(url, options)) return true;
  return openWithLinking(url);
}

/**
 * Harici link açar.
 * Web siteleri: expo-web-browser (Safari sheet / Chrome Custom Tab) → sistem tarayıcısı
 */
export async function openUrl(raw: string, options?: OpenUrlOptions): Promise<void> {
  const inAppRoute = resolveAppRouteFromShareUrl(raw);
  if (inAppRoute) {
    devLog('openUrl', 'in-app share route', { raw, inAppRoute });
    router.push(inAppRoute as never);
    return;
  }

  const url = normalizeLinkInput(raw);
  if (!url) return;

  const mode = resolveOpenMode(url);
  devLog('openUrl', 'open', { raw, url, mode });

  if (mode === 'in_app_web') {
    if (await openHttpInApp(url, options)) return;
  } else {
    if (await openWithLinking(url)) return;
    if (hasHttpScheme(url) && (await openHttpInApp(url, options))) return;
  }

  if (__DEV__) {
    Alert.alert('Link açılamadı', url);
  }
}
