import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { StoryFramedMediaView } from '@/features/stories/components/StoryFramedMediaView';
import { StoryMusicBadge } from '@/features/stories/components/StoryMusicBadge';
import { StoryMusicInfoSheet } from '@/features/stories/components/StoryMusicInfoSheet';
import { STORY_STICKER_CATEGORIES } from '@/features/stories/constants';
import { useStoryMuxPlaybackUrl } from '@/features/stories/hooks/useStoryMuxPlaybackUrl';
import { mapStoryMusicPlayback } from '@/features/stories/services/mapStoryMusic';
import {
  isStoryImageItem,
  resolveStoryMediaUrl,
  resolveStoryThumbUrl,
} from '@/features/stories/services/storyMediaUrl';
import type { StoryItem } from '@/features/stories/types';
import type { StoryMusicAddedBy } from '@/features/stories/types/storyMusic';
import type { StoryMusicManifest } from '@/features/stories/utils/storyManifest';
import { usePublishedMusicPlayer } from '@/features/music/hooks/usePublishedMusicPlayer';
import { useStandaloneMusicPlayer } from '@/features/music/hooks/useStandaloneMusicPlayer';
import { Text } from '@/components/ui/Text';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { spacing } from '@/constants/theme';

type StorySlideProps = {
  item: StoryItem;
  isActive: boolean;
  isPaused: boolean;
  musicAuthor?: StoryMusicAddedBy | null;
  onVideoPosition?: (sec: number, durationSec: number | null) => void;
  onVideoEnd?: () => void;
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
    <OptimizedImage
      uri={uri}
      tier="feed"
      style={styles.mediaFill}
      contentFit="cover"
      recyclingKey={`peek-${item.id}`}
      transition={0}
    />
  );
}

function StoryImageSlide({ item, isActive, isPaused, musicAuthor }: StorySlideProps) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const uri = resolveStoryMediaUrl(item.mediaUrl);
  const musicConfig = useMemo(() => mapStoryMusicPlayback(item.music), [item.music]);

  useStandaloneMusicPlayer({
    config: musicConfig,
    scopeActive: isActive && !isPaused,
    playing: isActive && !isPaused,
  });

  const imageFit = item.framing ? 'cover' : 'contain';

  const mediaNode = uri ? (
    <OptimizedImage
      uri={uri}
      tier="feed"
      style={styles.mediaFill}
      contentFit={imageFit}
      recyclingKey={item.id}
      transition={0}
    />
  ) : (
    <View style={styles.mediaFill} />
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
        locationLabel={item.location?.label ?? null}
        music={item.music}
        musicAuthor={musicAuthor}
      />
    </View>
  );
}

function StoryVideoSlide({
  item,
  isActive,
  isPaused,
  musicAuthor,
  onVideoPosition,
  onVideoEnd,
}: StorySlideProps) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const resolvedUrl = resolveStoryMediaUrl(item.mediaUrl);
  const posterUri = resolveStoryThumbUrl(item.thumbUrl, item.mediaUrl);
  const musicConfig = useMemo(() => mapStoryMusicPlayback(item.music), [item.music]);
  const muteOriginal = Boolean(musicConfig && musicConfig.originalAudioVolume <= 0.001);
  const { playbackUrl } = useStoryMuxPlaybackUrl(resolvedUrl);

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
    player.muted = muteOriginal;
    player.volume = muteOriginal ? 0 : musicConfig?.originalAudioVolume ?? 1;
  }, [muteOriginal, musicConfig, player]);

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

  const videoFit = item.framing ? 'cover' : 'contain';

  const mediaContent = (
    <View style={StyleSheet.absoluteFill}>
      {posterUri ? (
        <OptimizedImage
          uri={posterUri}
          tier="feed"
          style={StyleSheet.absoluteFill}
          contentFit={videoFit}
          recyclingKey={`${item.id}-poster`}
          transition={0}
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
        locationLabel={item.location?.label ?? null}
        music={item.music}
        musicAuthor={musicAuthor}
      />
    </View>
  );
}

function StorySlideOverlays({
  sticker,
  locationLabel,
  music,
  musicAuthor,
}: {
  sticker: (typeof STORY_STICKER_CATEGORIES)[number] | undefined;
  locationLabel: string | null;
  music: StoryMusicManifest | null;
  musicAuthor?: StoryMusicAddedBy | null;
}) {
  return (
    <>
      {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
      {locationLabel ? <StoryLocationBadge label={locationLabel} /> : null}
      {music ? (
        <StoryMusicViewerOverlay
          music={music}
          addedBy={musicAuthor}
          hasLocation={Boolean(locationLabel)}
        />
      ) : null}
    </>
  );
}

function StoryMusicViewerOverlay({
  music,
  addedBy,
  hasLocation,
}: {
  music: StoryMusicManifest;
  addedBy?: StoryMusicAddedBy | null;
  hasLocation: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <StoryMusicBadge
        title={music.displayTitle}
        artist={music.artist}
        stacked={hasLocation}
        onPress={addedBy ? () => setOpen(true) : undefined}
      />
      {addedBy ? (
        <StoryMusicInfoSheet
          visible={open}
          music={music}
          addedBy={addedBy}
          onClose={() => setOpen(false)}
        />
      ) : null}
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
    width: '100%',
    backgroundColor: '#111',
  },
  media: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mediaFit: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
  },
  mediaFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  peekFallback: {
    flex: 1,
    width: '100%',
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
