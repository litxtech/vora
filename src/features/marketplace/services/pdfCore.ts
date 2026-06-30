import { Platform, Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { toUserFacingError } from '@/lib/errors';

export const VORA_APP_NAME = 'Vora';
export const VORA_MARKETPLACE_LABEL = 'Yerel Pazar';
export const VORA_BRAND_COLOR = '#F07167';

export function escapePdfHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatPdfDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const VORA_PDF_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 28px; color: #1a1a1a; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid ${VORA_BRAND_COLOR}; }
  .brand-logo { font-size: 28px; font-weight: 900; color: ${VORA_BRAND_COLOR}; letter-spacing: 2px; }
  .brand-meta { line-height: 1.35; }
  .brand-app { font-size: 16px; font-weight: 700; }
  .brand-sub { font-size: 11px; color: #666; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 20px 0 8px; }
  .muted { color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  td, th { border: 1px solid #e0e0e0; padding: 7px 8px; font-size: 11px; text-align: left; vertical-align: top; }
  th { background: #fafafa; font-weight: 600; }
  .summary { margin-top: 14px; line-height: 1.7; font-size: 12px; }
  .summary div { margin-bottom: 2px; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
  .totals { margin-top: 12px; font-size: 12px; font-weight: 600; }
`;

export function voraPdfHeader(documentTitle: string, documentSubtitle?: string): string {
  return `
  <div class="brand">
    <div class="brand-logo">VORA</div>
    <div class="brand-meta">
      <div class="brand-app">${escapePdfHtml(VORA_APP_NAME)}</div>
      <div class="brand-sub">${escapePdfHtml(VORA_MARKETPLACE_LABEL)} · ${escapePdfHtml(documentTitle)}</div>
    </div>
  </div>
  ${documentSubtitle ? `<p class="muted">${escapePdfHtml(documentSubtitle)}</p>` : ''}`;
}

export function voraPdfFooter(): string {
  return `<div class="footer">${escapePdfHtml(VORA_APP_NAME)} uygulaması · ${escapePdfHtml(VORA_MARKETPLACE_LABEL)} · ${escapePdfHtml(formatPdfDate(new Date().toISOString()))}</div>`;
}

export async function loadPdfModules(): Promise<
  | {
      ok: true;
      printToFileAsync: (options: { html: string }) => Promise<{ uri: string }>;
      shareAsync: (url: string, options?: object) => Promise<void>;
      isSharingAvailableAsync: () => Promise<boolean>;
    }
  | { ok: false; error: string }
> {
  const rebuildHint =
    'PDF için dev client yeniden derlenmeli: npx expo run:ios veya npx expo run:android';

  if (!requireOptionalNativeModule('ExpoPrint')) {
    return { ok: false, error: rebuildHint };
  }

  try {
    const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
    if (!Print?.printToFileAsync) {
      return { ok: false, error: rebuildHint };
    }
    if (!Sharing?.shareAsync || !Sharing?.isAvailableAsync) {
      return { ok: false, error: rebuildHint };
    }
    return {
      ok: true,
      printToFileAsync: Print.printToFileAsync,
      shareAsync: Sharing.shareAsync,
      isSharingAvailableAsync: Sharing.isAvailableAsync,
    };
  } catch {
    return { ok: false, error: rebuildHint };
  }
}

export async function shareTextAsFallback(message: string, title: string): Promise<{ error: string | null }> {
  try {
    await Share.share(
      Platform.OS === 'ios' ? { message, title } : { message, title },
    );
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'Paylaşım iptal edildi.',
      }),
    };
  }
}

export async function sharePdfFile(uri: string, dialogTitle: string): Promise<{ error: string | null }> {
  const pdfModules = await loadPdfModules();
  if (!pdfModules.ok) return { error: pdfModules.error };

  try {
    const canShare = await pdfModules.isSharingAvailableAsync();
    if (!canShare) return { error: 'PDF paylaşımı bu cihazda desteklenmiyor.' };
    await pdfModules.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'PDF paylaşılamadı.',
      }),
    };
  }
}

export async function printAndShareHtml(html: string, dialogTitle: string): Promise<{ error: string | null }> {
  const pdfModules = await loadPdfModules();
  if (!pdfModules.ok) return { error: pdfModules.error };

  try {
    const { uri } = await pdfModules.printToFileAsync({ html });
    const shared = await sharePdfFile(uri, dialogTitle);
    if (shared.error && shared.error.includes('desteklenmiyor')) {
      return { error: shared.error };
    }
    return shared;
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'PDF oluşturulamadı.',
      }),
    };
  }
}
