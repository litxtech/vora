import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { PostMusicSoundToggle } from '@/features/music/components/PostMusicSoundToggle';
import { isLocalVideoUri, isVideoUrl } from '@/lib/media/isVideoUrl';
import { isProcessingVideoUrl, parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { resolvePlaybackUrl } from '@/lib/media/resolvePlaybackUrl';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { useLocalVideoPreviewStore } from '@/features/feed/store/localVideoPreviewStore';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { radius, spacing } from '@/constants/theme';

type FullScreenMediaViewerProps = {
  urls: string[];
  visible: boolean;
  startIndex?: number;
  onClose: () => void;
  musicSoundEnabled?: boolean;
  onMusicSoundToggle?: () => void;
  kinds?: Array<'image' | 'video'>;
};

function resolveViewerUri(uri: string): string | null {
  const videoId = parseProcessingVideoId(uri);
  if (videoId) {
    const local = useLocalVideoPreviewStore.getState().byVideoId[videoId]?.uri;
    if (local && isPlayableVideoUrl(local)) return normalizeLocalFileUri(local);
    return null;
  }
  const playback = resolvePlaybackUrl(uri);
  if (playback && isPlayableVideoUrl(playback)) return playback;
  if (isPlayableVideoUrl(uri)) return uri;
  return null;
}

function formatVideoTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function ViewerVideo({
  uri,
  isActive,
  onClose,
}: {
  uri: string;
  isActive: boolean;
  onClose: () => void;
}) {
  const resolved = resolveViewerUri(uri);
  if (!resolved) {
    return <VideoProcessingOverlay style={styles.media} />;
  }

  return <ViewerVideoPlayer uri={resolved} isActive={isActive} onClose={onClose} />;
}

function ViewerVideoPlayer({
  uri,
  isActive,
  onClose,
}: {
  uri: string;
  isActive: boolean;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const source = useMemo(() => toVideoSource(uri)!, [uri]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const longPressRef = useRef(false);

  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  }, []);

  useEffect(() => {
    const start = () => {
      try {
        if (!isActive) {
          player.pause();
          player.muted = true;
          player.volume = 0;
          return;
        }
        player.muted = false;
        player.volume = 1;
        player.play();
      } catch {
        // player henüz hazır değil
      }
    };

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && isActive) {
        setDuration(player.duration);
        start();
      }
    });
    const sourceSub = player.addListener('sourceLoad', ({ duration: loadedDuration }) => {
      setDuration(loadedDuration);
    });
    const timeSub = player.addListener('timeUpdate', ({ currentTime: nextTime }) => {
      setCurrentTime(nextTime);
    });

    if (!isActive) {
      try {
        player.pause();
        player.muted = true;
        player.volume = 0;
        player.playbackRate = 1;
      } catch {
        // released
      }
    } else {
      setDuration(player.duration);
      start();
    }

    return () => {
      statusSub.remove();
      sourceSub.remove();
      timeSub.remove();
      try {
        player.playbackRate = 1;
      } catch {
        // released
      }
    };
  }, [isActive, player, uri]);

  const startFastForward = () => {
    longPressRef.current = true;
    try {
      player.playbackRate = 2;
      player.play();
    } catch {
      // released
    }
  };

  const stopFastForward = () => {
    try {
      player.playbackRate = 1;
    } catch {
      // released
    }
    setTimeout(() => {
      longPressRef.current = false;
    }, 0);
  };

  const handleVideoPress = () => {
    if (longPressRef.current) return;
    onClose();
  };

  // Modal içinde onLayout gecikebilir / 0 kalabilir — pencere boyutunu hemen kullan.
  return (
    <View style={[styles.mediaWrap, { width, height }]} collapsable={false}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
        allowsPictureInPicture
      />
      <Pressable
        style={styles.videoGestureZone}
        onPress={handleVideoPress}
        onLongPress={startFastForward}
        onPressOut={stopFastForward}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel="Videoyu kapat; basılı tutarak iki kat hızlandır"
      />
      <View style={styles.videoTimeBadge} pointerEvents="none">
        <Text variant="caption" style={styles.videoTimeText}>
          {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
        </Text>
      </View>
    </View>
  );
}

/** Açılış dokunuşunun modal içine sızıp hemen kapatmasını engeller (öz. Android animasyonsuz Modal). */
const DISMISS_ARM_MS = 320;

export function FullScreenMediaViewer({
  urls,
  visible,
  startIndex = 0,
  onClose,
  musicSoundEnabled = false,
  onMusicSoundToggle,
  kinds,
}: FullScreenMediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef<FlatList<string>>(null);
  const dismissArmedRef = useRef(false);
  const settledRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      dismissArmedRef.current = false;
      return;
    }
    dismissArmedRef.current = false;
    const timer = setTimeout(() => {
      dismissArmedRef.current = true;
    }, DISMISS_ARM_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      settledRef.current = false;
      return;
    }
    settledRef.current = false;
    const safeIndex = Math.min(Math.max(startIndex, 0), Math.max(urls.length - 1, 0));
    setIndex(safeIndex);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (safeIndex > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
        timer = setTimeout(() => {
          settledRef.current = true;
        }, 80);
      });
    } else {
      settledRef.current = true;
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, startIndex, urls.length]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!settledRef.current) return;
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const handleBackdropPress = useCallback(() => {
    if (!dismissArmedRef.current) return;
    onClose();
  }, [onClose]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (!visible || urls.length === 0) return null;

  const safeIndex = Math.min(index, urls.length - 1);
  const playable = (url: string, itemIndex: number) =>
    kinds?.[itemIndex] === 'video' || isVideoUrl(url) || isLocalVideoUri(url);
  const showMusicSoundToggle =
    Boolean(onMusicSoundToggle) && urls.every((url, itemIndex) => !playable(url, itemIndex));

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
              onPress={playable(item, itemIndex) ? undefined : handleBackdropPress}
              accessibilityLabel="Kapat"
            >
              {playable(item, itemIndex) ? (
                itemIndex === safeIndex ? (
                  <View style={styles.mediaWrap} pointerEvents="box-none">
                    <ViewerVideo uri={item} isActive onClose={handleBackdropPress} />
                  </View>
                ) : (
                  <FeedMediaPreview url={item} style={styles.media} resizeMode="contain" showPlayIcon />
                )
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
  videoGestureZone: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 88,
    zIndex: 3,
  },
  videoTimeBadge: {
    position: 'absolute',
    left: spacing.md,
    bottom: 96,
    zIndex: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  videoTimeText: {
    color: '#fff',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
