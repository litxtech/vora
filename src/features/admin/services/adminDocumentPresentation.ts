import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export type AdminDocumentMediaType = 'image' | 'pdf';

export function toDisplayUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  return `file://${uri}`;
}

export function buildPdfViewerUri(uri: string): string {
  const displayUri = toDisplayUri(uri);

  if (displayUri.startsWith('file://')) {
    return displayUri;
  }

  if (Platform.OS === 'android') {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(displayUri)}`;
  }

  return displayUri;
}

export function buildPdfPreviewUri(uri: string): string {
  const displayUri = toDisplayUri(uri);

  if (displayUri.startsWith('file://')) {
    return displayUri;
  }

  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(displayUri)}`;
}

export async function openAdminPdfInApp(uri: string): Promise<void> {
  await WebBrowser.openBrowserAsync(buildPdfViewerUri(uri), {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    toolbarColor: '#111111',
    controlsColor: '#ffffff',
    showTitle: true,
  });
}
