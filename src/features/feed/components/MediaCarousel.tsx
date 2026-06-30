import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ImageContentFit } from 'expo-image';
import { FEED_MEDIA_ASPECT_RATIO, FEED_MEDIA_MAX_HEIGHT } from '@/features/feed/constants';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { FeedInlineVideoSlide } from '@/features/feed/components/FeedInlineVideoSlide';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const INLINE_ASPECT = 4 / 5;
const SLIDE_WINDOW = 1;

type MediaCarouselProps = {
  urls: string[];
  variant?: 'inline' | 'fullBleed';
  maxHeight?: number;
  onMediaPress?: (index: number) => void;
  onSlideIndexChange?: (index: number) => void;
  overlay?: ReactNode;
  imageContentFit?: ImageContentFit;
  logoFrame?: boolean;
  inlineVideo?: boolean;
  videoMounted?: boolean;
  videoActive?: boolean;
  videoMuted?: boolean;
};

function shouldRenderSlide(activeIndex: number, slideIndex: number, total: number): boolean {
  if (total <= 3) return true;
  const min = Math.max(0, activeIndex - SLIDE_WINDOW);
  const max = Math.min(total - 1, activeIndex + SLIDE_WINDOW);
  return slideIndex >= min && slideIndex <= max;
}

export const MediaCarousel = memo(function MediaCarousel({
  urls,
  variant = 'inline',
  maxHeight = FEED_MEDIA_MAX_HEIGHT,
  onMediaPress,
  onSlideIndexChange,
  overlay,
  imageContentFit = 'cover',
  logoFrame = false,
  inlineVideo = false,
  videoMounted = false,
  videoActive = false,
  videoMuted = true,
}: MediaCarouselProps) {
  const { colors } = useTheme();
  const isInline = variant === 'inline';

  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0) {
      setWidth((prev) => (prev === next ? prev : next));
    }
  }, []);

  const resolveHeight = useCallback(
    (_slideIndex = 0) => {
      if (width <= 0) return 0;

      const fallbackRatio = isInline
        ? logoFrame
          ? 16 / 9
          : INLINE_ASPECT
        : 1 / FEED_MEDIA_ASPECT_RATIO;

      return Math.min(width / fallbackRatio, maxHeight);
    },
    [width, isInline, maxHeight, logoFrame],
  );

  const visibleIndices = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < urls.length; i++) {
      if (shouldRenderSlide(index, i, urls.length)) set.add(i);
    }
    return set;
  }, [index, urls.length]);

  const updateIndex = useCallback(
    (next: number) => {
      setIndex(next);
      onSlideIndexChange?.(next);
    },
    [onSlideIndexChange],
  );

  if (urls.length === 0) return null;

  const borderRadius = isInline ? radius.xl : 0;
  const inlineHeight = width > 0 ? resolveHeight(0) : 0;
  const showDots = isInline && urls.length > 1;

  return (
    <View onLayout={onLayout} style={isInline ? styles.inlineOuter : undefined}>
      <View
        style={[
          isInline && styles.inlineFrame,
          isInline && {
            borderColor: `${colors.border}88`,
            borderRadius,
          },
          isInline && inlineHeight > 0 && { height: inlineHeight },
          overlay ? styles.frameWithOverlay : null,
        ]}
      >
        {width > 0 && inlineHeight > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={false}
              style={{ height: inlineHeight, backgroundColor: 'transparent' }}
              onMomentumScrollEnd={(e) => {
                const next = Math.round(e.nativeEvent.contentOffset.x / width);
                updateIndex(next);
              }}
            >
              {urls.map((url, i) => {
                const slideHeight = isInline ? inlineHeight : resolveHeight(i);
                const mediaStyle = [
                  styles.image,
                  {
                    width,
                    height: slideHeight,
                  },
                ];

                const renderMedia = visibleIndices.has(i);
                const fit = logoFrame ? 'contain' : imageContentFit;
                const slideVideoMounted = inlineVideo && videoMounted && index === i;
                const slideVideoActive = slideVideoMounted && videoActive;

                return (
                  <Pressable
                    key={`${url}-${i}`}
                    style={mediaStyle}
                    onPress={onMediaPress ? () => onMediaPress(i) : undefined}
                    disabled={!onMediaPress && !inlineVideo}
                  >
                    {!renderMedia ? null : isVideoUrl(url) ? (
                      inlineVideo ? (
                        slideVideoMounted ? (
                          <FeedInlineVideoSlide
                            url={url}
                            style={StyleSheet.absoluteFill}
                            isActive={slideVideoActive}
                            isMuted={videoMuted}
                            onPress={onMediaPress ? () => onMediaPress(i) : undefined}
                          />
                        ) : (
                          <FeedMediaPreview
                            url={url}
                            style={StyleSheet.absoluteFill}
                            layoutWidth={width}
                            showPlayIcon={false}
                            onPress={onMediaPress ? () => onMediaPress(i) : undefined}
                          />
                        )
                      ) : (
                        <FeedMediaPreview url={url} style={StyleSheet.absoluteFill} layoutWidth={width} />
                      )
                    ) : (
                      <OptimizedImage
                        uri={url}
                        style={StyleSheet.absoluteFill}
                        contentFit={fit}
                        tier="feed"
                        layoutWidth={width}
                        recyclingKey={`${url}-${i}`}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {overlay ? (
              <View style={styles.overlayLayer} pointerEvents="box-none">
                {overlay}
              </View>
            ) : null}

            {showDots ? (
              <View style={[styles.dots, overlay ? styles.dotsAboveOverlay : null]} pointerEvents="none">
                {urls.map((url, i) => (
                  <View
                    key={`dot-${url}-${i}`}
                    style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                aspectRatio: isInline ? (logoFrame ? 16 / 9 : INLINE_ASPECT) : 1 / FEED_MEDIA_ASPECT_RATIO,
                borderRadius,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  inlineOuter: {
    marginTop: spacing.sm,
  },
  inlineFrame: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  frameWithOverlay: {
    position: 'relative',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  placeholder: {},
  image: {},
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dotsAboveOverlay: {
    bottom: 44,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#fff',
    opacity: 1,
  },
  dotInactive: {
    backgroundColor: '#fff',
    opacity: 0.4,
  },
});
