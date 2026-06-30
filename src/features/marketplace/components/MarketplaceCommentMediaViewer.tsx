import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarketplacePhotoViewer } from '@/features/marketplace/components/MarketplacePhotoViewer';
import { isVideoUrl } from '@/features/marketplace/services/descriptionBlocks';
import { spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  mediaUrls: string[];
  initialIndex?: number;
  onClose: () => void;
};

function FullscreenVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

export function MarketplaceCommentMediaViewer({ visible, mediaUrls, initialIndex = 0, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!mediaUrls.length) return null;

  const safeIndex = Math.min(Math.max(initialIndex, 0), mediaUrls.length - 1);
  const activeUrl = mediaUrls[safeIndex];
  const isVideo = isVideoUrl(activeUrl);
  const imageUrls = mediaUrls.filter((url) => !isVideoUrl(url));
  const imageIndex = imageUrls.indexOf(activeUrl);

  if (!isVideo && imageUrls.length > 0) {
    return (
      <MarketplacePhotoViewer
        visible={visible}
        photos={imageUrls}
        initialIndex={imageIndex >= 0 ? imageIndex : 0}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={styles.videoWrap} pointerEvents="box-none">
          <FullscreenVideo url={activeUrl} />
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  videoWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  video: {
    width: '100%',
    height: '72%',
    maxHeight: 520,
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
