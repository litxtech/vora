import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ensureReelFeedAudioMode } from '@/features/music/services/audioPreview';
import { VideoView, type VideoPlayer } from 'expo-video';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { Text } from '@/components/ui/Text';
import { getReelPlaybackHealthCheckMs } from '@/lib/device/androidPerfProfile';
import { getMuxPlaybackUrl, getMuxThumbnailUrl } from '@/lib/mux/client';
import { toVideoSource } from '@/lib/media/videoSource';
import { SensitiveContentOverlay } from '@/features/moderation/components/SensitiveContentOverlay';
import { useSafetyPreferences } from '@/features/moderation/hooks/useSafetyPreferences';
import { recordReelCompleteView } from '@/features/reels/services/reelsEngagement';
import { prepareReelMusicInPool, attachReelMusic, detachReelMusicIfOwner, ensureReelVideoPlaying } from '@/features/music/services/reelMusicSync';
import { useReelVideoPlayer } from '@/features/reels/hooks/useReelVideoPlayer';
import { markReelWarmed, isReelWarmed } from '@/features/reels/services/reelWarmup';
import {
  isVideoPlayerAlive,
  readVideoPlayerBufferedPosition,
  readVideoPlayerCurrentTime,
  readVideoPlayerDuration,
  readVideoPlayerPlaying,
  readVideoPlayerStatus,
  runIfVideoPlayerAlive,
} from '@/features/reels/services/safeVideoPlayer';
import { PublishedStudioOverlays } from '@/features/vora-studio/components/PublishedStudioOverlays';
import type { ReelItem } from '@/features/reels/types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const OVERLAY_TICK_MS = 1000;
const COMPLETE_VIEW_THRESHOLD = 0.9;

function safePausePlayer(player: VideoPlayer) {
  runIfVideoPlayerAlive(player, (p) => {
    p.pause();
    p.muted = true;
    p.volume = 0;
  });
}

function startActiveVideo(
  player: VideoPlayer,
  hasMusic: boolean,
  originalVolume: number,
  resetToStart = false,
) {
  runIfVideoPlayerAlive(player, (p) => {
    p.loop = true;
    const currentTime = readVideoPlayerCurrentTime(p);
    if (resetToStart && currentTime != null && currentTime > 0.02) {
      p.currentTime = 0;
    }
    if (hasMusic) {
      const muteOriginal = originalVolume <= 0.001;
      p.muted = muteOriginal;
      p.volume = muteOriginal ? 0 : originalVolume;
    } else {
      p.muted = false;
      p.volume = 1;
    }
    p.play();
  });
}

type ReelPlayerProps = {
  item: ReelItem;
  isActive: boolean;
  shouldPreload?: boolean;
  inHotWindow?: boolean;
  height?: number;
  width?: number;
};

type ReelPlayerVideoProps = ReelPlayerProps & {
  item: ReelItem & { playbackId: string };
};

function ReelPlayerPlaceholder({
  item,
  height = SCREEN_HEIGHT,
  width = SCREEN_WIDTH,
  posterUrl,
  hideSensitive,
  onReveal,
}: {
  item: ReelItem;
  height?: number;
  width?: number;
  posterUrl: string | null;
  hideSensitive: boolean;
  onReveal: () => void;
}) {
  const prefs = useSafetyPreferences();

  return (
    <View style={[styles.container, { width, height }]}>
      {hideSensitive ? (
        <SensitiveContentOverlay onReveal={onReveal} blurred={prefs.blur_sensitive_content} />
      ) : null}
      {posterUrl && !hideSensitive ? (
        <Image source={{ uri: posterUrl }} style={[styles.mediaFill, { width, height }]} resizeMode="cover" />
      ) : !hideSensitive ? (
        <SafeLinearGradient colors={['#0A1628', '#1A3A5C', '#0D2137']} style={[styles.media, { width, height }]}>
          <Text style={styles.demoText}>🎬</Text>
        </SafeLinearGradient>
      ) : null}
      {item.isDemo ? (
        <View style={styles.demoBadge}>
          <Text variant="caption" style={{ color: '#FFB300' }}>Örnek Reel</Text>
        </View>
      ) : null}
    </View>
  );
}

function ReelPlayerVideo({
  item,
  isActive,
  shouldPreload = false,
  inHotWindow = false,
  height = SCREEN_HEIGHT,
  width = SCREEN_WIDTH,
}: ReelPlayerVideoProps & { inHotWindow?: boolean }) {
  const [showPoster, setShowPoster] = useState(true);
  const [videoSurfaceKey, setVideoSurfaceKey] = useState(0);
  const [overlayPlayhead, setOverlayPlayhead] = useState(0);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const hasTrackedComplete = useRef(false);
  const lastOverlayTickRef = useRef(0);
  const showPosterRef = useRef(true);
  const hasRenderedFrameRef = useRef(false);
  const needsRestartRef = useRef(true);
  const mountedRef = useRef(true);
  const prevShouldRenderVideoViewRef = useRef(shouldRenderVideoView);

  const hasMusic = Boolean(item.musicPlayback?.audioUrl);
  const hasTextOverlays = Boolean(item.editManifest?.textOverlays?.length);
  const shouldMountVideo = Boolean(item.playbackId && (isActive || shouldPreload || inHotWindow));
  // Müzikli reel: tek VideoView — çift yüzey video donmasına yol açar.
  const shouldRenderVideoView = hasMusic ? isActive : isActive || shouldPreload;
  const shouldPlay = isActive;
  const posterUrl = item.thumbnailUrl ?? getMuxThumbnailUrl(item.playbackId);

  const videoSource = useMemo(
    () => toVideoSource(getMuxPlaybackUrl(item.playbackId)),
    [item.playbackId],
  );

  const player = useReelVideoPlayer(item.playbackId, videoSource);
  const musicOriginalVolume = item.musicPlayback?.originalAudioVolume ?? 1;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hidePoster = useCallback(() => {
    hasRenderedFrameRef.current = true;
    if (showPosterRef.current) {
      showPosterRef.current = false;
      setShowPoster(false);
    }
    markReelWarmed(item.id);
  }, [item.id]);

  useEffect(() => {
    void ensureReelFeedAudioMode();
  }, []);

  useEffect(() => {
    if (isActive && isReelWarmed(item.id)) {
      hidePoster();
    }
  }, [isActive, item.id, hidePoster]);

  useEffect(() => {
    hasTrackedComplete.current = false;
    hasRenderedFrameRef.current = false;
    needsRestartRef.current = true;
    showPosterRef.current = true;
    setShowPoster(true);
    setOverlayPlayhead(0);
    lastOverlayTickRef.current = 0;
    setLayout({ width: 0, height: 0 });
  }, [item.id]);

  // VideoView kaldırılıp tekrar eklenince (sekme değişimi vb.) SurfaceView yeniden bağlanmalı.
  useEffect(() => {
    const wasRendering = prevShouldRenderVideoViewRef.current;
    prevShouldRenderVideoViewRef.current = shouldRenderVideoView;

    if (wasRendering && !shouldRenderVideoView) {
      safePausePlayer(player);
      hasRenderedFrameRef.current = false;
      showPosterRef.current = true;
      setShowPoster(true);
      return;
    }

    if (!wasRendering && shouldRenderVideoView) {
      setVideoSurfaceKey((key) => key + 1);
    }
  }, [shouldRenderVideoView, player]);

  useEffect(() => {
    if (!shouldRenderVideoView || !isActive || !isVideoPlayerAlive(player)) return;
    if (hasRenderedFrameRef.current || readVideoPlayerStatus(player) === 'readyToPlay') {
      hidePoster();
    }
  }, [shouldRenderVideoView, isActive, player, hidePoster]);

  useEffect(() => {
    if (!shouldRenderVideoView || !isActive || videoSurfaceKey === 0) return undefined;
    if (!isVideoPlayerAlive(player)) return undefined;

    let cancelled = false;

    const repaintSurface = () => {
      if (cancelled || !mountedRef.current || !isActive || !isVideoPlayerAlive(player)) return;

      const status = readVideoPlayerStatus(player);
      if (status === 'readyToPlay') {
        hidePoster();
        const time = readVideoPlayerCurrentTime(player) ?? 0;
        runIfVideoPlayerAlive(player, (p) => {
          p.currentTime = time;
        });
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(repaintSurface));

    const posterFallback = setTimeout(() => {
      if (cancelled || !mountedRef.current || !isActive || !isVideoPlayerAlive(player)) return;
      if (
        readVideoPlayerPlaying(player) === true ||
        readVideoPlayerStatus(player) === 'readyToPlay'
      ) {
        hidePoster();
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(posterFallback);
    };
  }, [videoSurfaceKey, shouldRenderVideoView, isActive, player, hidePoster]);

  useEffect(() => {
    if (!posterUrl) return;
    void Image.prefetch(posterUrl, 'memory-disk');
  }, [posterUrl]);

  useEffect(() => {
    if (!shouldMountVideo) {
      safePausePlayer(player);
      return;
    }

    if (!shouldPlay) {
      runIfVideoPlayerAlive(player, (p) => {
        p.pause();
        p.muted = true;
        p.volume = 0;
      });
      return () => {
        if (hasMusic) detachReelMusicIfOwner(item.id);
      };
    }

    let cancelled = false;
    let statusSub: { remove: () => void } | null = null;

    const runPlayback = () => {
      if (cancelled || !isActive || !mountedRef.current || !isVideoPlayerAlive(player)) return;

      runIfVideoPlayerAlive(player, (p) => {
        p.timeUpdateEventInterval = hasMusic ? 0.5 : 1;
      });

      const resetToStart = needsRestartRef.current;
      needsRestartRef.current = false;
      const currentTime = readVideoPlayerCurrentTime(player) ?? 0;
      const duration = readVideoPlayerDuration(player) ?? 0;
      const shouldSeekStart =
        resetToStart &&
        (currentTime > 0.5 || duration <= 0 || currentTime >= duration - 0.3);

      startActiveVideo(player, hasMusic, musicOriginalVolume, shouldSeekStart);

      if (hasMusic && item.musicPlayback) {
        void attachReelMusic(item.id, player, item.musicPlayback);
      }
    };

    const schedulePlayback = () => {
      if (!isVideoPlayerAlive(player)) return;

      const buffered =
        readVideoPlayerStatus(player) === 'readyToPlay' &&
        ((readVideoPlayerBufferedPosition(player) ?? 0) > 0.2 || hasRenderedFrameRef.current);

      if (buffered) {
        runPlayback();
        return;
      }

      if (readVideoPlayerStatus(player) === 'loading') {
        runPlayback();
        return;
      }

      requestAnimationFrame(runPlayback);
    };

    if (!isVideoPlayerAlive(player)) {
      return () => {
        cancelled = true;
        if (hasMusic) detachReelMusicIfOwner(item.id);
      };
    }

    statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') schedulePlayback();
    });

    if (readVideoPlayerStatus(player) === 'readyToPlay') {
      schedulePlayback();
    }

    return () => {
      cancelled = true;
      statusSub?.remove();
      if (hasMusic) detachReelMusicIfOwner(item.id);
    };
  }, [shouldMountVideo, shouldPlay, isActive, player, item.id, item.musicPlayback, hasMusic, musicOriginalVolume]);

  useEffect(() => {
    if (!shouldPreload || !item.musicPlayback) return;
    prepareReelMusicInPool(item.musicPlayback);
  }, [shouldPreload, item.musicPlayback]);

  useEffect(() => {
    if (!isActive || showPosterRef.current) return undefined;
    const fallback = setTimeout(() => {
      if (!mountedRef.current || !isActive) return;
      if (readVideoPlayerPlaying(player) === true) hidePoster();
    }, 600);
    return () => clearTimeout(fallback);
  }, [isActive, player, hidePoster]);

  useEffect(() => {
    if (!shouldMountVideo || !isActive) return;

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
      if (isPlaying) return;

      resumeTimer = setTimeout(() => {
        if (!mountedRef.current || !isActive || !isVideoPlayerAlive(player)) return;

        const duration = readVideoPlayerDuration(player) ?? 0;
        const currentTime = readVideoPlayerCurrentTime(player) ?? 0;
        const nearEnd = duration > 0 && currentTime >= duration - 0.75;

        runIfVideoPlayerAlive(player, (p) => {
          if (nearEnd) {
            p.loop = true;
            p.currentTime = 0;
          }
          if (readVideoPlayerPlaying(p) === false && readVideoPlayerStatus(p) === 'readyToPlay') {
            startActiveVideo(p, hasMusic, musicOriginalVolume);
            if (hasMusic && item.musicPlayback) {
              void attachReelMusic(item.id, p, item.musicPlayback);
            }
          }
        });
      }, 350);
    });

    return () => {
      playingSub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  }, [shouldMountVideo, isActive, player, hasMusic, musicOriginalVolume, item.id, item.musicPlayback]);

  useEffect(() => {
    if (!shouldPlay || !hasMusic) return;

    let lastTime = readVideoPlayerCurrentTime(player) ?? 0;
    let stuckTicks = 0;

    const tick = setInterval(() => {
      if (!mountedRef.current || !isActive || !isVideoPlayerAlive(player)) return;

      const playing = readVideoPlayerPlaying(player);
      if (playing !== true) {
        stuckTicks = 0;
        lastTime = readVideoPlayerCurrentTime(player) ?? lastTime;
        return;
      }

      const now = readVideoPlayerCurrentTime(player);
      if (now == null) return;

      if (Math.abs(now - lastTime) < 0.04) {
        stuckTicks += 1;
        if (stuckTicks >= 3) {
          ensureReelVideoPlaying(player);
          if (item.musicPlayback) {
            void attachReelMusic(item.id, player, item.musicPlayback);
          }
          stuckTicks = 0;
        }
      } else {
        stuckTicks = 0;
      }
      lastTime = now;
    }, getReelPlaybackHealthCheckMs());

    return () => clearInterval(tick);
  }, [shouldPlay, hasMusic, isActive, player, item.id, item.musicPlayback]);

  useEffect(() => {
    if (!shouldMountVideo || !isActive) return;

    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (hasTextOverlays) {
        const now = Date.now();
        if (now - lastOverlayTickRef.current >= OVERLAY_TICK_MS) {
          lastOverlayTickRef.current = now;
          setOverlayPlayhead(currentTime);
        }
      }

      if (!item.isDemo) {
        const duration = readVideoPlayerDuration(player) ?? 0;
        if (
          duration > 0 &&
          currentTime / duration >= COMPLETE_VIEW_THRESHOLD &&
          !hasTrackedComplete.current
        ) {
          hasTrackedComplete.current = true;
          recordReelCompleteView(item.id);
        }
      }
    });

    return () => timeSub.remove();
  }, [shouldMountVideo, isActive, player, item.id, item.isDemo, hasTextOverlays]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setLayout((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    }
  };

  return (
    <View style={[styles.container, { width, height }]} onLayout={onLayout} collapsable={false}>
      {shouldMountVideo && shouldRenderVideoView && isVideoPlayerAlive(player) ? (
        <VideoView
          key={videoSurfaceKey}
          player={player}
          style={styles.videoLayer}
          contentFit="cover"
          nativeControls={false}
          surfaceType="surfaceView"
          onFirstFrameRender={hidePoster}
        />
      ) : null}

      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          pointerEvents="none"
          style={[
            styles.poster,
            showPoster ? styles.posterVisible : styles.posterHidden,
          ]}
          resizeMode="cover"
        />
      ) : null}

      {hasTextOverlays && layout.width > 0 ? (
        <PublishedStudioOverlays
          editManifest={item.editManifest}
          playheadSec={overlayPlayhead}
          containerWidth={layout.width}
          containerHeight={layout.height || height}
        />
      ) : null}

      {item.isDemo ? (
        <View style={styles.demoBadge}>
          <Text variant="caption" style={{ color: '#FFB300' }}>Örnek Reel</Text>
        </View>
      ) : null}
    </View>
  );
}

function ReelPlayerInner({
  item,
  isActive,
  shouldPreload = false,
  inHotWindow = false,
  height = SCREEN_HEIGHT,
  width = SCREEN_WIDTH,
}: ReelPlayerProps) {
  const prefs = useSafetyPreferences();
  const [revealed, setRevealed] = useState(false);
  const hideSensitive = Boolean(item.isSensitive && !prefs.show_sensitive_content && !revealed);
  const posterUrl = useMemo(
    () => item.thumbnailUrl ?? (item.playbackId ? getMuxThumbnailUrl(item.playbackId) : null),
    [item.thumbnailUrl, item.playbackId],
  );

  if (!item.playbackId || hideSensitive) {
    return (
      <ReelPlayerPlaceholder
        item={item}
        height={height}
        width={width}
        posterUrl={posterUrl}
        hideSensitive={hideSensitive}
        onReveal={() => setRevealed(true)}
      />
    );
  }

  return (
    <ReelPlayerVideo
      item={{ ...item, playbackId: item.playbackId }}
      isActive={isActive}
      shouldPreload={shouldPreload}
      inHotWindow={inHotWindow}
      height={height}
      width={width}
    />
  );
}

function reelPlayerPropsEqual(prev: ReelPlayerProps, next: ReelPlayerProps): boolean {
  return (
    prev.item.id === next.item.id &&
    prev.isActive === next.isActive &&
    prev.shouldPreload === next.shouldPreload &&
    prev.inHotWindow === next.inHotWindow &&
    prev.height === next.height &&
    prev.width === next.width
  );
}

export const ReelPlayer = memo(ReelPlayerInner, reelPlayerPropsEqual);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  media: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  poster: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  posterVisible: {
    opacity: 1,
    zIndex: 3,
  },
  posterHidden: {
    opacity: 0,
    zIndex: 1,
  },
  videoLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    backgroundColor: '#000',
  },
  demoText: { fontSize: 64 },
  demoBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 3,
  },
});
