import { useMemo } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInAppWebStore } from '@/lib/linking/inAppWebStore';
import { loadWebView } from '@/lib/webview/support';

export function InAppWebModal() {
  const url = useInAppWebStore((s) => s.url);
  const close = useInAppWebStore((s) => s.close);
  const insets = useSafeAreaInsets();
  const WebView = useMemo(() => loadWebView(), []);

  if (!url || !WebView) return null;

  const openExternally = () => {
    const target = url;
    close();
    void Linking.openURL(target).catch(() => undefined);
  };

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('slide')}
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={close} hitSlop={12} accessibilityLabel="Kapat">
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Pressable onPress={openExternally} hitSlop={12} accessibilityLabel="Harici tarayıcıda aç">
            <Ionicons name="open-outline" size={22} color="#fff" />
          </Pressable>
        </View>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
          onError={openExternally}
          onHttpError={openExternally}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  webview: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
});
