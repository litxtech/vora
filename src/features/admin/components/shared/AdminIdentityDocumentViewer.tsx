import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import {
  buildPdfViewerUri,
  openAdminPdfInApp,
  type AdminDocumentMediaType,
} from '@/features/admin/services/adminDocumentPresentation';
import {
  isAdminWebViewAvailable,
  loadAdminWebView,
  type AdminWebViewProps,
} from '@/features/admin/services/adminWebViewSupport';
import { radius, spacing } from '@/constants/theme';

type AdminIdentityDocumentViewerProps = {
  uri: string | null;
  label: string;
  loading?: boolean;
  mediaType?: AdminDocumentMediaType;
  onClose: () => void;
};

export function AdminIdentityDocumentViewer({
  uri,
  label,
  loading = false,
  mediaType = 'image',
  onClose,
}: AdminIdentityDocumentViewerProps) {
  const insets = useSafeAreaInsets();
  const [PdfWebView, setPdfWebView] = useState<ComponentType<AdminWebViewProps> | null>(null);
  const [browserOpening, setBrowserOpening] = useState(false);
  const [browserFailed, setBrowserFailed] = useState(false);

  const pdfUri = uri ? buildPdfViewerUri(uri) : null;
  const useEmbeddedPdf = mediaType === 'pdf' && !!pdfUri && !!PdfWebView;

  useEffect(() => {
    if (mediaType !== 'pdf' || !isAdminWebViewAvailable()) {
      setPdfWebView(null);
      return;
    }
    const component = loadAdminWebView();
    setPdfWebView(() => component);
  }, [mediaType]);

  useEffect(() => {
    if (loading || mediaType !== 'pdf' || !uri || PdfWebView) return;

    let cancelled = false;
    setBrowserOpening(true);
    setBrowserFailed(false);

    void openAdminPdfInApp(uri)
      .then(() => {
        if (!cancelled) onClose();
      })
      .catch(() => {
        if (!cancelled) {
          setBrowserFailed(true);
          setBrowserOpening(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, mediaType, uri, PdfWebView, onClose]);

  if (!uri && !loading && !browserOpening) return null;

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('fade')}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={[styles.stage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {loading || browserOpening ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#fff" size="large" />
              {browserOpening ? (
                <Text variant="caption" style={styles.hint}>
                  PDF uygulama içi tarayıcıda açılıyor…
                </Text>
              ) : null}
            </View>
          ) : browserFailed ? (
            <View style={styles.centered}>
              <Ionicons name="document-text-outline" size={40} color="#fff" />
              <Text variant="caption" style={styles.hint}>
                PDF açılamadı. Dev client&apos;ı yeniden derleyin veya tekrar deneyin.
              </Text>
            </View>
          ) : useEmbeddedPdf && PdfWebView && pdfUri ? (
            <PdfWebView
              source={{ uri: pdfUri }}
              style={styles.pdf}
              originWhitelist={['*']}
              startInLoadingState
              renderLoading={() => <ActivityIndicator color="#fff" size="large" />}
              allowsInlineMediaPlayback
              setSupportMultipleWindows={false}
            />
          ) : uri ? (
            <View style={styles.imageWrap} pointerEvents="box-none">
              <Image source={{ uri }} style={styles.media} contentFit="contain" cachePolicy="none" />
            </View>
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text variant="label" style={styles.footerLabel}>
            {label}
          </Text>
          <Text variant="caption" style={styles.footerHint}>
            Kapatmak için ✕ düğmesine dokunun
          </Text>
        </View>

        <Pressable
          style={[
            styles.closeBtn,
            {
              top: insets.top + spacing.sm,
              right: spacing.md + insets.right,
            },
          ]}
          onPress={onClose}
          hitSlop={20}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  stage: {
    flex: 1,
    zIndex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '92%',
    height: '88%',
  },
  pdf: {
    flex: 1,
    backgroundColor: '#111',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  footerLabel: {
    color: '#fff',
    textAlign: 'center',
  },
  footerHint: {
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 30,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
