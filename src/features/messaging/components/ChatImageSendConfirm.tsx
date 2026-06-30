import { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';
import { CHAT_EPHEMERAL_DEFAULT_DURATION_SEC } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ChatImageSendConfirmProps = {
  visible: boolean;
  uris: string[];
  ephemeral: boolean;
  onEphemeralChange: (ephemeral: boolean) => void;
  onCancel: () => void;
  onSend: () => void;
  sending?: boolean;
};

export function ChatImageSendConfirm({
  visible,
  uris,
  ephemeral,
  onEphemeralChange,
  onCancel,
  onSend,
  sending = false,
}: ChatImageSendConfirmProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [previewIndex, setPreviewIndex] = useState(0);

  if (!visible || uris.length === 0) return null;

  const safeIndex = Math.min(previewIndex, uris.length - 1);
  const previewUri = uris[safeIndex]!;

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('fade')}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <StatusBar style="light" />
      <View style={styles.root}>

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={onCancel} style={styles.topBtn} hitSlop={12} accessibilityLabel="İptal">
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Text variant="body" style={styles.title}>
            Fotoğraf gönder
          </Text>
          <View style={styles.topBtn} />
        </View>

        <View style={styles.previewStage}>
          {uris.length > 1 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setPreviewIndex(index);
                }}
                style={StyleSheet.absoluteFill}
              >
                {uris.map((uri) => (
                  <View key={uri} style={styles.previewPage}>
                    <Image source={{ uri }} style={styles.previewImage} contentFit="contain" />
                  </View>
                ))}
              </ScrollView>
              <View style={styles.counterPill}>
                <Text variant="caption" style={styles.counterText}>
                  {safeIndex + 1}/{uris.length}
                </Text>
              </View>
            </>
          ) : (
            <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" />
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <BlurView intensity={isDark ? 40 : 55} tint={isDark ? 'dark' : 'light'} style={styles.footerBlur}>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => onEphemeralChange(true)}
                style={[styles.modeChip, ephemeral && { backgroundColor: colors.primary }]}
              >
                <Ionicons name="timer-outline" size={16} color="#fff" />
                <Text variant="caption" style={styles.modeChipText}>
                  Süreli ({CHAT_EPHEMERAL_DEFAULT_DURATION_SEC}s)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onEphemeralChange(false)}
                style={[styles.modeChip, !ephemeral && { backgroundColor: colors.primary }]}
              >
                <Ionicons name="infinite-outline" size={16} color="#fff" />
                <Text variant="caption" style={styles.modeChipText}>
                  Süresiz
                </Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={onCancel}
                disabled={sending}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { borderColor: 'rgba(255,255,255,0.35)', opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text variant="body" style={styles.cancelBtnText}>
                  İptal
                </Text>
              </Pressable>
              <Pressable
                onPress={onSend}
                disabled={sending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: colors.primary, opacity: pressed || sending ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="send" size={18} color="#fff" />
                <Text variant="body" style={styles.sendBtnText}>
                  {sending ? 'Gönderiliyor…' : 'Gönder'}
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 2,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: '700',
  },
  previewStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  counterPill: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  counterText: {
    color: '#fff',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    zIndex: 2,
  },
  footerBlur: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modeChipText: {
    color: '#fff',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  sendBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
