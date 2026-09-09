import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { ensureReelFeedAudioMode } from '@/features/music/services/audioPreview';
import {
  readVideoPlayerPlaying,
  readVideoPlayerStatus,
  runIfVideoPlayerAlive,
} from '@/features/reels/services/safeVideoPlayer';
import { isProcessingVideoUrl, parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';
import { useLocalVideoPreviewStore } from '@/features/feed/store/localVideoPreviewStore';
import { warmLocalVideoPoster } from '@/features/feed/services/warmLocalVideoPoster';
import { normalizeLocalFileUri } from '@/lib/files/readLocalFile';

type FeedInlineVideoSlideProps = {
  url: string;
  style: StyleProp<ViewStyle>;
  /** Oynatma aktif */
  isActive: boolean;
  isMuted: boolean;
  onPress?: () => void;
};

function applyInlineVideoAudio(player: VideoPlayer, muted: boolean) {
  runIfVideoPlayerAlive(player, (p) => {
    p.muted = muted;
    p.volume = muted ? 0 : 1;
  });
}

function startInlineVideo(player: VideoPlayer, muted: boolean) {
  applyInlineVideoAudio(player, muted);
  runIfVideoPlayerAlive(player, (p) => {
    p.play();
  });
}

function pauseInlineVideo(player: VideoPlayer) {
  runIfVideoPlayerAlive(player, (p) => {
    p.pause();
  });
}

function PosterLayer({ uri }: { uri: string }) {
  const normalized = normalizeLocalFileUri(uri);
  if (normalized.startsWith('file://') || normalized.startsWith('content://')) {
    return (
      <Image source={{ uri: normalized }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    );
  }
  return (
    <OptimizedImage
      uri={normalized}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      tier="thumb"
      recyclingKey={`poster-${normalized}`}
    />
  );
}

export const FeedInlineVideoSlide = memo(function FeedInlineVideoSlide(
  props: FeedInlineVideoSlideProps,
) {
  const videoId = parseProcessingVideoId(props.url);
  const previewEntry = useLocalVideoPreviewStore((s) =>
    videoId ? s.byVideoId[videoId] ?? null : null,
  );
  const localPreview = previewEntry?.uri ? normalizeLocalFileUri(previewEntry.uri) : null;
  const localPoster = previewEntry?.posterUri
    ? normalizeLocalFileUri(previewEntry.posterUri)
    : null;

  useEffect(() => {
    if (!videoId || !localPreview || localPoster) return;
    warmLocalVideoPoster(videoId, localPreview);
  }, [videoId, localPreview, localPoster]);

  // Paylaşan cihaz: Mux hazır olmadan yerel dosyayı oynat
  if (isProcessingVideoUrl(props.url) && localPreview && isPlayableVideoUrl(localPreview)) {
    return (
      <FeedInlineVideoSlideReady
        {...props}
        url={localPreview}
        posterUri={localPoster}
      />
    );
  }

  if (isProcessingVideoUrl(props.url) || !isPlayableVideoUrl(props.url)) {
    // Yerel kapak varsa işleniyor ekranı yerine önizleme göster
    if (localPoster) {
      return (
        <Pressable style={props.style} onPress={props.onPress} disabled={!props.onPress}>
          <PosterLayer uri={localPoster} />
        </Pressable>
      );
    }
    return <VideoProcessingOverlay style={props.style} />;
  }

  return <FeedInlineVideoSlideReady {...props} />;
});

const FeedInlineVideoSlideReady = memo(function FeedInlineVideoSlideReady({
  url,
  style,
  isActive,
  isMuted,
  onPress,
  posterUri: posterOverride,
}: FeedInlineVideoSlideProps & { posterUri?: string | null }) {
  const [showPoster, setShowPoster] = useState(true);
  const source = useMemo(() => toVideoSource(url)!, [url]);
  const posterUrl = useMemo(
    () => posterOverride ?? resolveVideoThumbnailUrl(url),
    [posterOverride, url],
  );
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
  });

  const hidePoster = useCallback(() => {
    setShowPoster(false);
  }, []);

  useEffect(() => {
    setShowPoster(true);
  }, [url]);

  useEffect(() => {
    if (!isActive) return;
    void ensureReelFeedAudioMode();
  }, [isActive]);

  // Ses ayrı — mute toggle oynatmayı yeniden başlatmasın / poster flaşı yapmasın.
  useEffect(() => {
    if (!isActive) return;
    if (!isMuted) void ensureReelFeedAudioMode();
    applyInlineVideoAudio(player, isMuted);
  }, [isActive, isMuted, player]);

  useEffect(() => {
    if (!isActive) {
      pauseInlineVideo(player);
      return;
    }

    const tryPlay = () => startInlineVideo(player, isMutedRef.current);
    tryPlay();

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        tryPlay();
        if (readVideoPlayerPlaying(player) === true) hidePoster();
      }
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) hidePoster();
    });

    if (readVideoPlayerStatus(player) === 'readyToPlay' && readVideoPlayerPlaying(player) === true) {
      hidePoster();
    }

    const posterFallback = setTimeout(() => {
      if (readVideoPlayerPlaying(player) === true || readVideoPlayerStatus(player) === 'readyToPlay') {
        hidePoster();
      }
    }, 500);

    return () => {
      statusSub.remove();
      playingSub.remove();
      clearTimeout(posterFallback);
    };
  }, [isActive, player, url, hidePoster]);

  return (
    <View style={style}>
      {posterUrl && showPoster ? <PosterLayer uri={posterUrl} /> : null}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      {onPress ? (
        <Pressable
          style={styles.tapCatcher}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Videoyu aç"
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  tapCatcher: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
