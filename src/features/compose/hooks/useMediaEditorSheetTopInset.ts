import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Paylaşım / düzenleme ekranı header yüksekliği (safe area hariç) */
export const MEDIA_EDITOR_SHEET_HEADER_CHROME = 56;

/** Klavye açıkken alt sheet'in üst sınırı — header'ın altında kalır */
export function useMediaEditorSheetTopInset(headerChrome = MEDIA_EDITOR_SHEET_HEADER_CHROME): number {
  const insets = useSafeAreaInsets();
  return insets.top + headerChrome;
}
