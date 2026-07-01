import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { StoryFramedMediaView } from '@/features/stories/components/StoryFramedMediaView';
import { STORY_STICKER_CATEGORIES } from '@/features/stories/constants';
import { useStoryMuxPlaybackUrl } from '@/features/stories/hooks/useStoryMuxPlaybackUrl';
import { mapStoryMusicPlayback } from '@/features/stories/services/mapStoryMusic';
import {
  isStoryImageItem,
  resolveStoryMediaUrl,
  resolveStoryThumbUrl,
} from '@/features/stories/services/storyMediaUrl';
import type { StoryItem } from '@/features/stories/types';
import { usePublishedMusicPlayer } from '@/features/music/hooks/usePublishedMusicPlayer';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { Text } from '@/components/ui/Text';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { spacing } from '@/constants/theme';

type StorySlideProps = {
  item: StoryItem;
  isActive: boolean;
  isPaused: boolean;
  onVideoPosition?: (sec: number, durationSec: number | null) => void;
  onVideoEnd?: () => void;
};

export function StorySlide(props: StorySlideProps) {
  if (isStoryImageItem(props.item.mediaType, props.item.mediaUrl)) {
    return <StoryImageSlide {...props} />;
  }
  return <StoryVideoSlide {...props} />;
}

function StoryImageSlide({ item, isActive, isPaused }: StorySlideProps) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const uri = resolveStoryMediaUrl(item.mediaUrl);
  const musicConfig = useMemo(() => mapStoryMusicPlayback(item.music), [item.music]);

  useStandaloneMusicPlayer({
    config: musicConfig,
    scopeActive: isActive && !isPaused,
    playing: isActive && !isPaused,
  });

  const mediaNode = (
    <OptimizedImage
      uri={uri}
      tier="feed"
      style={styles.mediaFill}
      contentFit="cover"
      recyclingKey={item.id}
      transition={0}
    />
  );

  return (
    <View style={styles.root}>
      {item.framing ? (
        <StoryFramedMediaView framing={item.framing}>{mediaNode}</StoryFramedMediaView>
      ) : (
        <View style={styles.media}>{mediaNode}</View>
      )}
      <StorySlideOverlays sticker={sticker} locationLabel={item.location?.label ?? null} />
    </View>
  );
}

function StoryVideoSlide({
  item,
  isActive,
  isPaused,
  onVideoPosition,
  onVideoEnd,
}: StorySlideProps) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const resolvedUrl = resolveStoryMediaUrl(item.mediaUrl);
  const posterUri = resolveStoryThumbUrl(item.thumbUrl, item.mediaUrl);
  const musicConfig = useMemo(() => mapStoryMusicPlayback(item.music), [item.music]);
  const muteOriginal = Boolean(musicConfig && musicConfig.originalAudioVolume <= 0.001);
  const { playbackUrl } = useStoryMuxPlaybackUrl(resolvedUrl);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const source = useMemo(() => {
    if (!playbackUrl || !isPlayableVideoUrl(playbackUrl)) return null;
    return toVideoSource(playbackUrl);
  }, [playbackUrl]);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = muteOriginal;
    p.volume = muteOriginal ? 0 : musicConfig?.originalAudioVolume ?? 1;
    p.timeUpdateEventInterval = 0.1;
  });

  usePublishedMusicPlayer({
    videoPlayer: player,
    config: musicConfig,
    active: isActive && !isPaused && Boolean(source),
  });

  useEffect(() => {
    setIsVideoReady(false);
  }, [item.id, source]);

  useEffect(() => {
    player.muted = muteOriginal;
    player.volume = muteOriginal ? 0 : musicConfig?.originalAudioVolume ?? 1;
  }, [muteOriginal, musicConfig, player]);

  useEffect(() => {
    if (!source) return;

    player.timeUpdateEventInterval = 0.1;

    const tickSub = player.addListener('timeUpdate', ({ currentTime }) => {
      const duration = player.duration > 0 ? player.duration : item.durationSec ?? 0;
      onVideoPosition?.(currentTime, duration > 0 ? duration : item.durationSec);
      if (duration > 0 && currentTime >= duration - 0.05) {
        onVideoEnd?.();
      }
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setIsVideoReady(true);
        const duration = player.duration > 0 ? player.duration : item.durationSec ?? null;
        onVideoPosition?.(player.currentTime, duration);
        if (isActive && !isPaused) {
          try {
            player.play();
          } catch {
            /* player not ready */
          }
        }
      }
    });

    if (!isActive || isPaused) {
      try {
        player.pause();
      } catch {
        /* released */
      }
    } else if (player.status === 'readyToPlay') {
      setIsVideoReady(true);
      try {
        player.play();
      } catch {
        /* released */
      }
    }

    return () => {
      tickSub.remove();
      statusSub.remove();
    };
  }, [isActive, isPaused, item.durationSec, onVideoEnd, onVideoPosition, player, source]);

  const waitingForSource = !source;
  const showProcessingOverlay = waitingForSource && !posterUri;

  const mediaContent = (
    <View style={styles.mediaFill}>
      {posterUri ? (
        <OptimizedImage
          uri={posterUri}
          tier="feed"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          recyclingKey={`${item.id}-poster`}
          transition={0}
        />
      ) : null}
      {source ? (
        <VideoView
          player={player}
          style={[styles.mediaFill, !isVideoReady && styles.hiddenVideo]}
          contentFit="cover"
          nativeControls={false}
        />
      ) : null}
      {showProcessingOverlay ? (
        <VideoProcessingOverlay style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {item.framing ? (
        <StoryFramedMediaView framing={item.framing}>{mediaContent}</StoryFramedMediaView>
      ) : (
        <View style={styles.media}>{mediaContent}</View>
      )}
      <StorySlideOverlays sticker={sticker} locationLabel={item.location?.label ?? null} />
    </View>
  );
}

function StorySlideOverlays({
  sticker,
  locationLabel,
}: {
  sticker: (typeof STORY_STICKER_CATEGORIES)[number] | undefined;
  locationLabel: string | null;
}) {
  return (
    <>
      {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
      {locationLabel ? <StoryLocationBadge label={locationLabel} /> : null}
    </>
  );
}

function StoryStickerBadge({
  sticker,
}: {
  sticker: (typeof STORY_STICKER_CATEGORIES)[number];
}) {
  return (
    <View style={styles.sticker}>
      <Ionicons name={sticker.icon} size={14} color="#fff" />
      <Text variant="caption" style={styles.stickerText}>
        {sticker.label}
      </Text>
    </View>
  );
}

function StoryLocationBadge({ label }: { label: string }) {
  return (
    <View style={styles.location}>
      <Ionicons name="location" size={14} color="#fff" />
      <Text variant="caption" style={styles.stickerText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaFill: {
    width: '100%',
    height: '100%',
  },
  hiddenVideo: {
    opacity: 0,
  },
  sticker: {
    position: 'absolute',
    top: spacing.lg + 36,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '72%',
  },
  location: {
    position: 'absolute',
    bottom: spacing.xl + 48,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '78%',
  },
  stickerText: {
    color: '#fff',
    fontWeight: '700',
    flexShrink: 1,
  },
});
