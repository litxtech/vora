import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { StoryFramedMediaView } from '@/features/stories/components/StoryFramedMediaView';
import { StoryMediaImage } from '@/features/stories/components/StoryMediaImage';
import { StoryTextOverlayView } from '@/features/stories/components/StoryTextOverlayView';
import { StoryLocationOverlay } from '@/features/stories/components/StoryLocationOverlay';
import { STORY_STICKER_CATEGORIES } from '@/features/stories/constants';
import { useStoryMuxPlaybackUrl } from '@/features/stories/hooks/useStoryMuxPlaybackUrl';
import { mapStoryMusicPlayback } from '@/features/stories/services/mapStoryMusic';
import {
  isStoryVideoOriginalMuted,
  resolveStoryVideoOriginalVolume,
} from '@/features/stories/services/resolveStoryVideoVolume';
import {
  isStoryImageItem,
  resolveStoryMediaUrl,
  resolveStoryThumbUrl,
} from '@/features/stories/services/storyMediaUrl';
import type { StoryItem } from '@/features/stories/types';
import { useStoryImageMusicPlayer } from '@/features/stories/hooks/useStoryImageMusicPlayer';
import { useStoryVideoMusicPlayer } from '@/features/stories/hooks/useStoryVideoMusicPlayer';
import { Text } from '@/components/ui/Text';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { spacing } from '@/constants/theme';

type StorySlideProps = {
  item: StoryItem;
  isActive: boolean;
  isPaused: boolean;
  onVideoPosition?: (sec: number, durationSec: number | null) => void;
  onVideoEnd?: () => void;
  /** Metin katmanını dışarıda render etmek için (zoom transform dışında). */
  includeTextOverlays?: boolean;
};

export function StorySlide(props: StorySlideProps) {
  if (isStoryImageItem(props.item.mediaType, props.item.mediaUrl)) {
    return <StoryImageSlide {...props} />;
  }
  return <StoryVideoSlide {...props} />;
}

/** Komşu kullanıcı peek önizlemesi — tam StorySlide yerine hafif thumbnail. */
export function StoryPeekPreview({ item }: { item: StoryItem }) {
  const uri = resolveStoryThumbUrl(item.thumbUrl, item.mediaUrl);

  if (!uri) {
    return <View style={styles.peekFallback} />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <StoryMediaImage
        uri={uri}
        recyclingKey={`peek-${item.id}`}
        contentFit="cover"
      />
    </View>
  );
}

function StoryImageSlide({ item, isActive, isPaused, includeTextOverlays = true }: StorySlideProps) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const uri = resolveStoryMediaUrl(item.mediaUrl);
  const musicConfig = useMemo(() => mapStoryMusicPlayback(item.music), [item.music]);

  useStoryImageMusicPlayer({
    itemId: item.id,
    config: musicConfig,
    active: isActive && !isPaused,
  });

  const imageFit = 'cover';

  const mediaNode = (
    <View style={StyleSheet.absoluteFill}>
      <StoryMediaImage uri={uri} recyclingKey={item.id} contentFit={imageFit} />
    </View>
  );

  return (
    <View style={styles.root}>
      {item.framing ? (
        <StoryFramedMediaView framing={item.framing}>{mediaNode}</StoryFramedMediaView>
      ) : (
        <View style={styles.mediaFit}>{mediaNode}</View>
      )}
      <StorySlideOverlays
        sticker={sticker}
        location={item.location}
        textOverlays={includeTextOverlays ? item.textOverlays : []}
      />
    </View>
  );
}

function StoryVideoSlide({
  item,
  isActive,
  isPaused,
  onVideoPosition,
  onVideoEnd,
  includeTextOverlays = true,
}: StorySlideProps) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const resolvedUrl = resolveStoryMediaUrl(item.mediaUrl);
  const posterUri = resolveStoryThumbUrl(item.thumbUrl, item.mediaUrl);
  const musicConfig = useMemo(() => mapStoryMusicPlayback(item.music), [item.music]);
  const originalVolume = useMemo(() => resolveStoryVideoOriginalVolume(item), [item]);
  const muteOriginal = isStoryVideoOriginalMuted(item);
  const { playbackUrl } = useStoryMuxPlaybackUrl(resolvedUrl);

  const source = useMemo(() => {
    if (!playbackUrl || !isPlayableVideoUrl(playbackUrl)) return null;
    return toVideoSource(playbackUrl);
  }, [playbackUrl]);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = muteOriginal;
    p.volume = muteOriginal ? 0 : originalVolume;
    p.timeUpdateEventInterval = 0.1;
  });

  useStoryVideoMusicPlayer({
    itemId: item.id,
    videoPlayer: player,
    config: musicConfig,
    active: isActive && !isPaused && Boolean(source),
  });

  const onVideoPositionRef = useRef(onVideoPosition);
  const onVideoEndRef = useRef(onVideoEnd);
  const endedRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  onVideoPositionRef.current = onVideoPosition;
  onVideoEndRef.current = onVideoEnd;
  isActiveRef.current = isActive;
  isPausedRef.current = isPaused;

  useEffect(() => {
    endedRef.current = false;
  }, [item.id, source]);

  useEffect(() => {
    if (musicConfig?.audioUrl) return;
    player.muted = muteOriginal;
    player.volume = muteOriginal ? 0 : originalVolume;
  }, [musicConfig?.audioUrl, muteOriginal, originalVolume, player]);

  useEffect(() => {
    if (!source) return;

    player.timeUpdateEventInterval = 0.1;

    const tickSub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (!isActiveRef.current || isPausedRef.current) return;
      const duration = player.duration > 0 ? player.duration : item.durationSec ?? 0;
      onVideoPositionRef.current?.(currentTime, duration > 0 ? duration : item.durationSec);
      if (duration > 0.5 && currentTime >= duration - 0.08 && !endedRef.current) {
        endedRef.current = true;
        onVideoEndRef.current?.();
      }
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        const duration = player.duration > 0 ? player.duration : item.durationSec ?? null;
        onVideoPositionRef.current?.(player.currentTime, duration);
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
  }, [isActive, isPaused, item.durationSec, item.id, player, source]);

  const waitingForSource = !source;
  const showProcessingOverlay = waitingForSource && !posterUri;

  const videoFit = 'cover';

  const mediaContent = (
    <View style={StyleSheet.absoluteFill}>
      {posterUri ? (
        <StoryMediaImage
          uri={posterUri}
          recyclingKey={`${item.id}-poster`}
          contentFit={videoFit}
        />
      ) : null}
      {source ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={videoFit}
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
        <View style={styles.mediaFit}>{mediaContent}</View>
      )}
      <StorySlideOverlays
        sticker={sticker}
        location={item.location}
        textOverlays={includeTextOverlays ? item.textOverlays : []}
      />
    </View>
  );
}

function StorySlideOverlays({
  sticker,
  location,
  textOverlays,
}: {
  sticker: (typeof STORY_STICKER_CATEGORIES)[number] | undefined;
  location: StoryItem['location'];
  textOverlays: StoryItem['textOverlays'];
}) {
  return (
    <>
      {textOverlays.length > 0 ? <StoryTextOverlayView overlays={textOverlays} /> : null}
      {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
      {location?.label ? <StoryLocationOverlay location={location} /> : null}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#111',
  },
  mediaFit: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  peekFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
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
  stickerText: {
    color: '#fff',
    fontWeight: '700',
    flexShrink: 1,
  },
});
