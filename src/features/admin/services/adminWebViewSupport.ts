import type { ComponentType, ReactElement } from 'react';
import { TurboModuleRegistry } from 'react-native';

export type AdminWebViewProps = {
  source: { uri: string };
  style?: object;
  originWhitelist?: string[];
  startInLoadingState?: boolean;
  renderLoading?: () => ReactElement;
  allowsInlineMediaPlayback?: boolean;
  setSupportMultipleWindows?: boolean;
  scrollEnabled?: boolean;
  bounces?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  pointerEvents?: 'none' | 'auto';
  onLoadEnd?: () => void;
  onError?: () => void;
  onHttpError?: () => void;
};

type WebViewComponent = ComponentType<AdminWebViewProps>;

let webViewCache: WebViewComponent | null | undefined;

/**
 * react-native-webview paketi require edildiğinde getEnforcing çağırır.
 * Native binary'de modül yoksa paketi hiç yüklemeyin.
 */
export function isAdminWebViewAvailable(): boolean {
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') != null;
  } catch {
    return false;
  }
}

export function loadAdminWebView(): WebViewComponent | null {
  if (webViewCache !== undefined) return webViewCache;

  if (!isAdminWebViewAvailable()) {
    webViewCache = null;
    return null;
  }

  try {
    const mod = require('react-native-webview') as { WebView?: WebViewComponent };
    webViewCache = mod.WebView ?? null;
  } catch {
    webViewCache = null;
  }

  return webViewCache;
}
