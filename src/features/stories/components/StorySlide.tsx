import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { VideoProcessingOverlay } from '@/components/media/VideoProcessingOverlay';
import { StoryFramedMediaView } from '@/features/stories/components/StoryFramedMediaView';
import { STORY_STICKER_CATEGORIES } from '@/features/stories/constants';
import { useStoryMuxPlaybackUrl } from '@/features/stories/hooks/useStoryMuxPlaybackUrl';
import { isStoryImageItem, resolveStoryMediaUrl } from '@/features/stories/services/storyMediaUrl';
import type { StoryItem } from '@/features/stories/types';
import { Text } from '@/components/ui/Text';
import { isPlayableVideoUrl, toVideoSource } from '@/lib/media/videoSource';
import { spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type StorySlideProps = {
  item: StoryItem;
  isActive: boolean;
  isPaused: boolean;
  onVideoPosition?: (sec: number, durationSec: number | null) => void;
  onVideoEnd?: () => void;
};

export function StorySlide(props: StorySlideProps) {
  if (isStoryImageItem(props.item.mediaType, props.item.mediaUrl)) {
    return <StoryImageSlide item={props.item} />;
  }
  return <StoryVideoSlide {...props} />;
}

function StoryImageSlide({ item }: { item: StoryItem }) {
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);
  const uri = resolveStoryMediaUrl(item.mediaUrl);

  if (item.framing) {
    return (
      <View style={styles.root}>
        <StoryFramedMediaView framing={item.framing}>
          <OptimizedImage
            uri={uri}
            tier="feed"
            style={styles.mediaFill}
            contentFit="cover"
            recyclingKey={item.id}
            transition={0}
          />
        </StoryFramedMediaView>
        {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <OptimizedImage
        uri={uri}
        tier="feed"
        style={styles.media}
        contentFit="cover"
        recyclingKey={item.id}
        transition={0}
      />
      {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
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
  const { playbackUrl, isProcessing } = useStoryMuxPlaybackUrl(resolvedUrl);

  const source = useMemo(() => {
    if (!playbackUrl || !isPlayableVideoUrl(playbackUrl)) return null;
    return toVideoSource(playbackUrl);
  }, [playbackUrl]);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (!source) return;

    const tickSub = player.addListener('timeUpdate', ({ currentTime }) => {
      const duration = player.duration > 0 ? player.duration : item.durationSec ?? 0;
      onVideoPosition?.(currentTime, duration > 0 ? duration : item.durationSec);
      if (duration > 0 && currentTime >= duration - 0.05) {
        onVideoEnd?.();
      }
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && isActive && !isPaused) {
        try {
          player.play();
        } catch {
          /* player not ready */
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
  }, [isActive, isPaused, item.durationSec, onVideoEnd, onVideoPosition, player, source]);

  if (isProcessing || !source) {
    const processingNode = <VideoProcessingOverlay style={styles.mediaFill} />;
    return (
      <View style={styles.root}>
        {item.framing ? (
          <StoryFramedMediaView framing={item.framing}>{processingNode}</StoryFramedMediaView>
        ) : (
          processingNode
        )}
        {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
      </View>
    );
  }

  const videoNode = (
    <VideoView
      player={player}
      style={styles.mediaFill}
      contentFit="cover"
      nativeControls={false}
    />
  );

  return (
    <View style={styles.root}>
      {item.framing ? (
        <StoryFramedMediaView framing={item.framing}>{videoNode}</StoryFramedMediaView>
      ) : (
        <View style={styles.media}>{videoNode}</View>
      )}
      {sticker ? <StoryStickerBadge sticker={sticker} /> : null}
    </View>
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
  },
  stickerText: {
    color: '#fff',
    fontWeight: '700',
  },
});
