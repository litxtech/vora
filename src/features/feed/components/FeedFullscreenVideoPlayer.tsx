import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import { ensureReelFeedAudioMode } from '@/features/music/services/audioPreview';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { radius, spacing } from '@/constants/theme';

const DISMISS_TX = 72;
const DISMISS_VX = 650;

type FeedFullscreenVideoPlayerProps = {
  uri: string;
  posterUri?: string | null;
  style?: StyleProp<ViewStyle>;
  /** Paylaşımda orijinal ses kapatıldı — hiç ses çalma */
  muted?: boolean;
  /** Sola / sağa kaydırınca çık */
  onSwipeDismiss?: () => void;
};

function formatVideoTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

/**
 * Feed tam ekran oynatıcı.
 * - Basılı tut: 2×
 * - Sola/sağa kaydır: çık (VideoView transform edilmez)
 * - Tıklama kapatmaz
 */
export const FeedFullscreenVideoPlayer = memo(function FeedFullscreenVideoPlayer({
  uri,
  posterUri,
  style,
  muted = false,
  onSwipeDismiss,
}: FeedFullscreenVideoPlayerProps) {
  const { width, height } = useWindowDimensions();
  const [showPoster, setShowPoster] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const normalizedUri = useMemo(() => normalizeLocalFileUri(uri), [uri]);
  const source = useMemo(() => toVideoSource(normalizedUri), [normalizedUri]);
  const playable = Boolean(source) && isPlayableVideoUrl(normalizedUri);

  const player = useVideoPlayer(playable ? source : null, (p) => {
    p.loop = true;
    p.muted = muted;
    p.volume = muted ? 0 : 1;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    try {
      player.muted = muted;
      player.volume = muted ? 0 : 1;
    } catch {
      // released
    }
  }, [muted, player]);

  useEffect(() => {
    setShowPoster(true);
    setCurrentTime(0);
    setDuration(0);
  }, [normalizedUri]);

  useEffect(() => {
    if (!playable) return;

    void ensureReelFeedAudioMode();

    const tryPlay = () => {
      try {
        player.play();
      } catch {
        // henüz hazır değil
      }
    };

    tryPlay();

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setDuration(player.duration);
        tryPlay();
      }
    });
    const sourceSub = player.addListener('sourceLoad', ({ duration: loadedDuration }) => {
      setDuration(loadedDuration);
    });
    const timeSub = player.addListener('timeUpdate', ({ currentTime: nextTime }) => {
      setCurrentTime(nextTime);
    });
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) setShowPoster(false);
    });

    const fallback = setTimeout(() => {
      tryPlay();
      setShowPoster(false);
    }, 800);

    return () => {
      statusSub.remove();
      sourceSub.remove();
      timeSub.remove();
      playingSub.remove();
      clearTimeout(fallback);
      try {
        player.playbackRate = 1;
        player.pause();
      } catch {
        // released
      }
    };
  }, [playable, player, normalizedUri]);

  const startFastForward = useCallback(() => {
    try {
      player.playbackRate = 2;
      player.play();
    } catch {
      // released
    }
  }, [player]);

  const stopFastForward = useCallback(() => {
    try {
      player.playbackRate = 1;
    } catch {
      // released
    }
  }, [player]);

  const dismiss = useCallback(() => {
    onSwipeDismiss?.();
  }, [onSwipeDismiss]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-18, 18])
      .failOffsetY([-28, 28])
      .onEnd((event) => {
        const shouldClose =
          Math.abs(event.translationX) >= DISMISS_TX ||
          Math.abs(event.velocityX) >= DISMISS_VX;
        if (shouldClose && onSwipeDismiss) {
          runOnJS(dismiss)();
        }
      });

    const longPress = Gesture.LongPress()
      .minDuration(300)
      .onStart(() => {
        runOnJS(startFastForward)();
      })
      .onFinalize(() => {
        runOnJS(stopFastForward)();
      });

    // Yatay kaydırma öncelikli; aksi halde basılı tut = 2×
    return Gesture.Exclusive(pan, longPress);
  }, [dismiss, onSwipeDismiss, startFastForward, stopFastForward]);

  const poster = posterUri ? normalizeLocalFileUri(posterUri) : null;
  const localPoster =
    poster && (poster.startsWith('file://') || poster.startsWith('content://'));

  return (
    <View style={[styles.root, { width, height }, style]} collapsable={false}>
      {playable ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          allowsPictureInPicture
          onFirstFrameRender={() => setShowPoster(false)}
        />
      ) : null}

      {poster && showPoster ? (
        localPoster ? (
          <Image
            source={{ uri: poster }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            pointerEvents="none"
          />
        ) : (
          <OptimizedImage
            uri={poster}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            tier="thumb"
            recyclingKey={`fs-poster-${poster}`}
            pointerEvents="none"
          />
        )
      ) : null}

      <GestureDetector gesture={gesture}>
        <View style={styles.gestureZone} />
      </GestureDetector>

      <View style={styles.timeBadge} pointerEvents="none">
        <Text variant="caption" style={styles.timeText}>
          {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  gestureZone: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 140,
    zIndex: 3,
  },
  timeBadge: {
    position: 'absolute',
    left: spacing.md,
    bottom: 148,
    zIndex: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  timeText: {
    color: '#fff',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
