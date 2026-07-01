import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { STORY_STICKER_CATEGORIES } from '@/features/stories/constants';
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

export function StorySlide({ item, isActive, isPaused, onVideoPosition, onVideoEnd }: StorySlideProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const sticker = STORY_STICKER_CATEGORIES.find((s) => s.id === item.stickerCategory);

  const source = useMemo(
    () => (item.mediaType === 'video' && isPlayableVideoUrl(item.mediaUrl) ? toVideoSource(item.mediaUrl) : null),
    [item.mediaType, item.mediaUrl],
  );

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (item.mediaType !== 'video' || !isActive) return;

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
  }, [isActive, isPaused, item.durationSec, item.mediaType, onVideoEnd, onVideoPosition, player]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setLayout({ width, height });
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      {item.mediaType === 'image' ? (
        <Image source={{ uri: item.mediaUrl }} style={styles.media} contentFit="cover" transition={120} />
      ) : layout.width > 0 ? (
        <VideoView
          player={player}
          style={{ width: layout.width, height: layout.height }}
          contentFit="cover"
          nativeControls={false}
        />
      ) : null}

      {sticker ? (
        <View style={styles.sticker}>
          <Ionicons name={sticker.icon} size={14} color="#fff" />
          <Text variant="caption" style={styles.stickerText}>
            {sticker.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
  sticker: {
    position: 'absolute',
    top: spacing.xl + 28,
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
