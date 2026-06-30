import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { ensureReelFeedAudioMode } from '@/features/music/services/audioPreview';
import {
  readVideoPlayerPlaying,
  readVideoPlayerStatus,
  runIfVideoPlayerAlive,
} from '@/features/reels/services/safeVideoPlayer';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { resolveVideoThumbnailUrl } from '@/lib/media/videoThumbnailUrl';

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
    p.muted = true;
    p.volume = 0;
  });
}

export const FeedInlineVideoSlide = memo(function FeedInlineVideoSlide(props: FeedInlineVideoSlideProps) {
  if (isProcessingVideoUrl(props.url) || !isPlayableVideoUrl(props.url)) {
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
}: FeedInlineVideoSlideProps) {
  const [showPoster, setShowPoster] = useState(true);
  const source = useMemo(() => toVideoSource(url)!, [url]);
  const posterUrl = useMemo(() => resolveVideoThumbnailUrl(url), [url]);

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

  useEffect(() => {
    if (!isActive) {
      pauseInlineVideo(player);
      setShowPoster(true);
      return;
    }

    const tryPlay = () => startInlineVideo(player, isMuted);
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
  }, [isActive, isMuted, player, url, hidePoster]);

  return (
    <Pressable style={style} onPress={onPress} disabled={!onPress}>
      {posterUrl && showPoster ? (
        <OptimizedImage
          uri={posterUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          tier="thumb"
          recyclingKey={`poster-${url}`}
        />
      ) : null}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </Pressable>
  );
});
