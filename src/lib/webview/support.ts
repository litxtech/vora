import type { ComponentType, ReactElement } from 'react';
import { TurboModuleRegistry } from 'react-native';

export type AppWebViewProps = {
  source: { uri: string };
  style?: object;
  startInLoadingState?: boolean;
  renderLoading?: () => ReactElement;
  onError?: () => void;
  onHttpError?: () => void;
};

let webViewCache: ComponentType<AppWebViewProps> | null | undefined;

export function isWebViewNativeAvailable(): boolean {
  try {
    return TurboModuleRegistry.get('RNCWebViewModule') != null;
  } catch {
    return false;
  }
}

export function loadWebView(): ComponentType<AppWebViewProps> | null {
  if (webViewCache !== undefined) return webViewCache;

  if (!isWebViewNativeAvailable()) {
    webViewCache = null;
    return null;
  }

  try {
    const mod = require('react-native-webview') as { WebView?: ComponentType<AppWebViewProps> };
    webViewCache = mod.WebView ?? null;
  } catch {
    webViewCache = null;
  }

  return webViewCache;
}
