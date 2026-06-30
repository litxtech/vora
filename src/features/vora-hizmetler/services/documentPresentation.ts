import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export type HizmetDocumentMediaType = 'image' | 'pdf';

export function inferHizmetDocumentMediaType(url: string): HizmetDocumentMediaType {
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.pdf')) return 'pdf';
  return 'image';
}

function buildPdfViewerUri(uri: string): string {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    if (Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`;
    }
  }
  return uri;
}

export async function openHizmetPdfInApp(uri: string): Promise<void> {
  await WebBrowser.openBrowserAsync(buildPdfViewerUri(uri), {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    toolbarColor: '#111111',
    controlsColor: '#ffffff',
    showTitle: true,
  });
}
