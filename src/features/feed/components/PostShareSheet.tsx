import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PostShareCard } from '@/features/feed/components/PostShareCard';
import {
  capturePostShareCard,
  savePostShareCardToGallery,
  sharePostLinkOnly,
  sharePostShareCardImage,
  sharePostWhatsApp,
} from '@/features/feed/services/postShare';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PostShareSheetProps = {
  visible: boolean;
  item: FeedItem;
  onClose: () => void;
};

type ShareAction = {
  id: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  run: () => Promise<void>;
};

const CARD_ACCENT = '#80DEEA';
const DISMISS_DRAG_PX = 72;
const DISMISS_VELOCITY = 700;

export function PostShareSheet({ visible, item, onClose }: PostShareSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragY = useSharedValue(0);
  const scrollOffsetY = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setMediaReady(!item.mediaUrls[0]);
    dragY.value = 0;
  }, [visible, item.mediaUrls, item.sourceId, dragY]);

  const requestClose = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const dismissPan = Gesture.Pan()
    .enabled(!busy)
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        dragY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DRAG_PX || event.velocityY > DISMISS_VELOCITY) {
        dragY.value = withTiming(420, { duration: 200, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(requestClose)();
        });
        return;
      }
      dragY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  const runWithCapture = useCallback(
    async (
      action: (uri: string) => Promise<{ error: string | null }>,
      options?: { successMessage?: string; closeOnSuccess?: boolean },
    ) => {
      if (busy) return;
      setBusy(true);
      try {
        const captured = await capturePostShareCard(cardRef);
        if (!captured.uri) {
          Alert.alert('Kart', captured.error ?? 'Görsel oluşturulamadı.');
          return;
        }
        const result = await action(captured.uri);
        if (result.error) {
          Alert.alert('Paylaşım', result.error);
          return;
        }
        if (options?.successMessage) {
          Alert.alert('Tamam', options.successMessage);
        }
        if (options?.closeOnSuccess !== false) {
          onClose();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, onClose],
  );

  const actions: ShareAction[] = [
    {
      id: 'gallery',
      label: 'Galeriye indir',
      subtitle: 'Vora kartını fotoğraf olarak kaydet',
      icon: 'download-outline',
      color: CARD_ACCENT,
      run: async () => {
        await runWithCapture(savePostShareCardToGallery, { successMessage: 'Kart galerinize kaydedildi.' });
      },
    },
    {
      id: 'share-image',
      label: 'Kartı paylaş',
      subtitle: 'Instagram, WhatsApp ve diğer uygulamalar',
      icon: 'image-outline',
      color: '#5C6BC0',
      run: async () => {
        await runWithCapture(sharePostShareCardImage);
      },
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      subtitle: 'Metin ve gönderi linki',
      icon: 'logo-whatsapp',
      color: '#25D366',
      run: async () => {
        const result = await sharePostWhatsApp(item);
        if (result.error) Alert.alert('WhatsApp', result.error);
        else onClose();
      },
    },
    {
      id: 'link',
      label: 'Link paylaş',
      subtitle: 'Sadece metin ve vora.app bağlantısı',
      icon: 'link-outline',
      color: colors.primary,
      run: async () => {
        await sharePostLinkOnly(item);
        onClose();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={requestClose}
    >
      <View style={[styles.root, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        />

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              backgroundColor: colors.surfaceElevated,
              paddingBottom: insets.bottom + spacing.md,
              borderColor: colors.border,
            },
          ]}
        >
          <GestureDetector gesture={dismissPan}>
            <View style={styles.dragZone}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text variant="label" style={styles.title}>
                Paylaş
              </Text>
              <Text secondary variant="caption" style={styles.subtitle}>
                İçeriği Vora kartıyla dışarı aktar
              </Text>
            </View>
          </GestureDetector>

            <View style={styles.previewFrame}>
              <ScrollView
                horizontal={false}
                showsVerticalScrollIndicator={false}
                bounces
                scrollEventThrottle={16}
                onScroll={(event) => {
                  scrollOffsetY.current = event.nativeEvent.contentOffset.y;
                }}
                onScrollEndDrag={(event) => {
                  if (busy) return;
                  const { contentOffset, velocity } = event.nativeEvent;
                  if (scrollOffsetY.current <= 0 && (contentOffset.y < -48 || velocity?.y < -0.45)) {
                    requestClose();
                  }
                }}
                contentContainerStyle={styles.previewScroll}
                style={styles.previewArea}
              >
                <PostShareCard
                  ref={cardRef}
                  item={item}
                  onMediaLoaded={() => setMediaReady(true)}
                />
                {!mediaReady ? (
                  <View style={styles.previewLoading}>
                    <ActivityIndicator color={CARD_ACCENT} size="small" />
                  </View>
                ) : null}
              </ScrollView>
            </View>

            {actions.map((action) => (
              <Pressable
                key={action.id}
                disabled={busy || (action.id !== 'link' && action.id !== 'whatsapp' && !mediaReady)}
                onPress={() => action.run()}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: colors.border, opacity: pressed || busy ? 0.6 : 1 },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${action.color}18` }]}>
                  {busy && (action.id === 'gallery' || action.id === 'share-image') ? (
                    <ActivityIndicator color={action.color} size="small" />
                  ) : (
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  )}
                </View>
                <View style={styles.rowBody}>
                  <Text variant="label">{action.label}</Text>
                  <Text secondary variant="caption">
                    {action.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}

            <Pressable onPress={requestClose} disabled={busy} style={styles.cancelBtn}>
              <Text variant="label" secondary>
                Kapat
              </Text>
            </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    maxHeight: '92%',
  },
  dragZone: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: spacing.xs },
  previewFrame: {
    backgroundColor: '#0A0E14',
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  previewArea: {
    maxHeight: 520,
  },
  previewScroll: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  previewLoading: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
});
