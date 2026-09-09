import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { CapClipVideo } from '@/features/caps/components/CapClipVideo';
import { CapLoopVideo } from '@/features/caps/components/CapLoopVideo';
import { CapOverlayLayer } from '@/features/caps/components/CapOverlayLayer';
import type { CapOverlayStyle } from '@/features/caps/types';
import { Image } from 'expo-image';
import { spacing } from '@/constants/theme';

type CapFullscreenModalProps = {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  videoUrl?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  overlay?: CapOverlayStyle | null;
};

/** Basılı tutulunca büyük ekran caps önizlemesi. */
export function CapFullscreenModal({
  visible,
  onClose,
  imageUrl,
  videoUrl,
  startMs,
  endMs,
  overlay,
}: CapFullscreenModalProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const size = Math.min(width - spacing.lg * 2, height * 0.72);
  const hasClip =
    Boolean(videoUrl) && startMs != null && endMs != null && endMs > startMs;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('fade')}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.frame, { width: size, height: size, marginTop: insets.top }]}>
          {videoUrl ? (
            hasClip ? (
              <CapClipVideo
                videoUrl={videoUrl}
                posterUrl={imageUrl}
                startMs={startMs}
                endMs={endMs}
                style={styles.media}
                contentFit="contain"
                muted={false}
              />
            ) : (
              <CapLoopVideo
                videoUrl={videoUrl}
                posterUrl={imageUrl}
                style={styles.media}
                contentFit="contain"
                muted={false}
              />
            )
          ) : (
            <Image source={{ uri: imageUrl }} style={styles.media} contentFit="contain" />
          )}
          <CapOverlayLayer overlay={overlay} />
        </View>
        <Pressable
          onPress={onClose}
          style={[styles.close, { top: insets.top + spacing.md }]}
          hitSlop={12}
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  close: {
    position: 'absolute',
    right: spacing.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
