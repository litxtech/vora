import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text } from '@/components/ui/Text';
import { PostMusicSoundToggle } from '@/features/music/components/PostMusicSoundToggle';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { radius, spacing } from '@/constants/theme';

type FullScreenMediaViewerProps = {
  urls: string[];
  visible: boolean;
  startIndex?: number;
  onClose: () => void;
  musicSoundEnabled?: boolean;
  onMusicSoundToggle?: () => void;
};

function ViewerVideo({ uri, isActive }: { uri: string; isActive: boolean }) {
  if (isProcessingVideoUrl(uri) || !isPlayableVideoUrl(uri)) {
    return <VideoProcessingOverlay style={styles.media} />;
  }

  return <ViewerVideoPlayer uri={uri} isActive={isActive} />;
}

function ViewerVideoPlayer({ uri, isActive }: { uri: string; isActive: boolean }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const source = useMemo(() => toVideoSource(uri)!, [uri]);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  };

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  }, []);

  useEffect(() => {
    const start = () => {
      if (!isActive) return;
      try {
        player.play();
      } catch {
        // player henüz hazır değil
      }
    };

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && isActive) {
        start();
      }
    });

    if (!isActive) {
      try {
        player.pause();
      } catch {
        // released
      }
    } else if (player.status === 'readyToPlay') {
      start();
    }

    return () => {
      statusSub.remove();
    };
  }, [isActive, player, uri]);

  return (
    <View style={styles.mediaWrap} onLayout={onLayout}>
      {layout.width > 0 ? (
        <VideoView
          player={player}
          style={{ width: layout.width, height: layout.height }}
          contentFit="contain"
          nativeControls
          allowsPictureInPicture
        />
      ) : null}
    </View>
  );
}

export function FullScreenMediaViewer({
  urls,
  visible,
  startIndex = 0,
  onClose,
  musicSoundEnabled = false,
  onMusicSoundToggle,
}: FullScreenMediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (!visible) return;
    const safeIndex = Math.min(Math.max(startIndex, 0), Math.max(urls.length - 1, 0));
    setIndex(safeIndex);
    if (safeIndex > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
      });
    }
  }, [visible, startIndex, urls.length]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (urls.length === 0) return null;

  const safeIndex = Math.min(index, urls.length - 1);
  const showMusicSoundToggle =
    Boolean(onMusicSoundToggle) && urls.every((url) => !isVideoUrl(url));

  return (
    <Modal
      visible={visible}
      animationType={resolveModalAnimationType('fade')}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={urls}
          keyExtractor={(url, i) => `${url}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex > 0 && startIndex < urls.length ? startIndex : undefined}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index: itemIndex }) => (
            <Pressable
              style={[styles.page, { width, height }]}
              onPress={onClose}
              accessibilityLabel="Kapat"
            >
              {isVideoUrl(item) ? (
                <View style={styles.mediaWrap} pointerEvents="box-none">
                  <ViewerVideo uri={item} isActive={visible && itemIndex === safeIndex} />
                </View>
              ) : (
                <Image
                  source={{ uri: item }}
                  style={styles.media}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  recyclingKey={item}
                  pointerEvents="none"
                />
              )}
            </Pressable>
          )}
        />

        {urls.length > 1 ? (
          <View style={[styles.counter, { top: insets.top + spacing.sm }]}>
            <Text variant="caption" style={styles.counterText}>
              {safeIndex + 1}/{urls.length}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.closeBtn, { top: insets.top + spacing.sm, right: spacing.md + insets.right }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>

        {showMusicSoundToggle ? (
          <PostMusicSoundToggle
            enabled={musicSoundEnabled}
            onToggle={onMusicSoundToggle!}
            style={[styles.musicSoundToggle, { bottom: insets.bottom + spacing.lg, right: spacing.md + insets.right }]}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  counterText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicSoundToggle: {
    position: 'absolute',
    zIndex: 10,
  },
});
