import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image as RnImage, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ImageContentFit, ImageLoadEventData } from 'expo-image';
import { FEED_MEDIA_ASPECT_RATIO } from '@/features/feed/constants';
import { getFeedMediaMaxHeight } from '@/lib/device/androidPerfProfile';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { FeedInlineVideoSlide } from '@/features/feed/components/FeedInlineVideoSlide';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

/** Genişlik / yükseklik — Instagram aralığı. */
const MIN_INLINE_ASPECT = 4 / 5;
const MAX_INLINE_ASPECT = 1.91;
const DEFAULT_INLINE_ASPECT = 1;
const VIDEO_INLINE_ASPECT = 4 / 5;
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

function clampFeedAspect(width: number, height: number): number {
  if (width <= 0 || height <= 0) return DEFAULT_INLINE_ASPECT;
  const aspect = width / height;
  return Math.min(MAX_INLINE_ASPECT, Math.max(MIN_INLINE_ASPECT, aspect));
}

function shouldRenderSlide(activeIndex: number, slideIndex: number, total: number): boolean {
  if (total <= 3) return true;
  const min = Math.max(0, activeIndex - SLIDE_WINDOW);
  const max = Math.min(total - 1, activeIndex + SLIDE_WINDOW);
  return slideIndex >= min && slideIndex <= max;
}

export const MediaCarousel = memo(function MediaCarousel({
  urls,
  variant = 'inline',
  maxHeight = getFeedMediaMaxHeight(),
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
  const [aspectByUrl, setAspectByUrl] = useState<Record<string, number>>({});

  const rememberAspect = useCallback((url: string, nextAspect: number) => {
    setAspectByUrl((prev) => {
      if (prev[url] != null && Math.abs(prev[url] - nextAspect) < 0.01) return prev;
      return { ...prev, [url]: nextAspect };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const url of urls) {
      if (!url || isVideoUrl(url)) continue;
      RnImage.getSize(
        url,
        (w, h) => {
          if (cancelled) return;
          rememberAspect(url, clampFeedAspect(w, h));
        },
        () => undefined,
      );
    }
    return () => {
      cancelled = true;
    };
  }, [urls, rememberAspect]);

  const activeUrl = urls[index] ?? urls[0] ?? '';
  const activeIsVideo = activeUrl ? isVideoUrl(activeUrl) : false;
  const measuredAspect = aspectByUrl[activeUrl] ?? aspectByUrl[urls[0] ?? ''] ?? DEFAULT_INLINE_ASPECT;

  const mediaAspect = isInline
    ? logoFrame
      ? 16 / 9
      : activeIsVideo
        ? VIDEO_INLINE_ASPECT
        : measuredAspect
    : 1 / FEED_MEDIA_ASPECT_RATIO;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0) {
      setWidth((prev) => (prev === next ? prev : next));
    }
  }, []);

  const resolveHeight = useCallback(
    (layoutWidth: number, aspect: number) => {
      if (layoutWidth <= 0 || aspect <= 0) return 0;
      return Math.min(layoutWidth / aspect, maxHeight);
    },
    [maxHeight],
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

  const handleImageLoad = useCallback(
    (url: string) => (event: ImageLoadEventData) => {
      const source = event.source;
      if (!source?.width || !source?.height) return;
      rememberAspect(url, clampFeedAspect(source.width, source.height));
    },
    [rememberAspect],
  );

  if (urls.length === 0) return null;

  const borderRadius = isInline ? radius.xl : 0;
  const inlineHeight = width > 0 ? resolveHeight(width, mediaAspect) : 0;
  const showDots = isInline && urls.length > 1;
  // İlk paint'te aspectRatio ile yer ayır; ölçüldükten sonra sabit height (maxHeight ile çakışmasın).
  const frameLayoutStyle = isInline
    ? {
        borderColor: `${colors.border}88`,
        borderRadius,
        backgroundColor: colors.surfaceElevated,
        ...(width > 0
          ? { height: inlineHeight }
          : { aspectRatio: mediaAspect, maxHeight }),
      }
    : null;

  // Çerçeve görsel oranına uyunca cover tam oturur; logo kartlarında contain.
  const fit = logoFrame ? 'contain' : imageContentFit;

  return (
    <View onLayout={onLayout} style={isInline ? styles.inlineOuter : undefined}>
      <View
        style={[
          isInline && styles.inlineFrame,
          frameLayoutStyle,
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
              style={[styles.carouselScroll, { height: inlineHeight }]}
              onMomentumScrollEnd={(e) => {
                const next = Math.round(e.nativeEvent.contentOffset.x / width);
                updateIndex(next);
              }}
            >
              {urls.map((url, i) => {
                const slideHeight = isInline ? inlineHeight : resolveHeight(width, mediaAspect);
                const mediaStyle = [
                  styles.image,
                  {
                    width,
                    height: slideHeight,
                    backgroundColor: isInline ? colors.surfaceElevated : '#000',
                  },
                ];

                const renderMedia = visibleIndices.has(i);
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
                            showPlayIcon
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
                        onLoad={handleImageLoad(url)}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {overlay ? (
              <View style={styles.overlayLayer} pointerEvents="box-none">
                {onMediaPress && inlineVideo && videoMounted ? (
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => onMediaPress(index)}
                    accessibilityRole="button"
                    accessibilityLabel="Videoyu aç"
                  />
                ) : null}
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
          <View style={styles.placeholder} />
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
    width: '100%',
  },
  frameWithOverlay: {
    position: 'relative',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  placeholder: {},
  carouselScroll: {
    backgroundColor: 'transparent',
  },
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
