import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import {
  recordAnnouncementCtaClick,
  recordAnnouncementView,
} from '@/features/announcements/services/announcementsData';
import type { Announcement, AnnouncementMediaItem } from '@/features/announcements/types';
import { toVideoSource } from '@/lib/media/videoSource';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  announcement: Announcement | null;
  onClose: () => void;
};

/** Galeriyi normalize et: yeni `media` dizisi yoksa eski tekil alanlardan türet. */
function resolveMedia(a: Announcement): AnnouncementMediaItem[] {
  if (a.media.length > 0) return a.media;
  if ((a.mediaType === 'image' || a.mediaType === 'video') && a.mediaUrl) {
    return [{ type: a.mediaType, url: a.mediaUrl, thumbnailUrl: a.thumbnailUrl }];
  }
  return [];
}

function VideoSlide({ item, width, active }: { item: AnnouncementMediaItem; width: number; active: boolean }) {
  const source = toVideoSource(item.url);
  const player = useVideoPlayer(source ?? null, (p) => {
    p.loop = true;
    p.muted = false;
    p.volume = 1;
  });

  useEffect(() => {
    try {
      if (active) player.play();
      else player.pause();
    } catch {
      // oynatma hazır değilse sessizce geç
    }
  }, [player, active]);

  return <VideoView player={player} style={{ width, height: '100%' }} contentFit="cover" nativeControls />;
}

function openAnnouncementLink(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;
  if (trimmed.startsWith('/')) {
    router.push(trimmed as Href);
    return;
  }
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  void Linking.openURL(normalized);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const DISMISS_DRAG_PX = 120;
const DISMISS_VELOCITY = 800;

export function AnnouncementDetailSheet({ announcement, onClose }: Props) {
  return (
    <Modal
      visible={Boolean(announcement)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {announcement ? <DetailContent announcement={announcement} onClose={onClose} /> : null}
    </Modal>
  );
}

function DetailContent({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    id,
    title,
    body,
    linkUrl,
    linkLabel,
    accent,
    authorName,
    authorAvatarUrl,
    createdAt,
  } = announcement;

  const media = resolveMedia(announcement);
  const [mediaWidth, setMediaWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const mediaUrls = media.map((item) => item.url);

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  const onMediaLayout = useCallback((e: LayoutChangeEvent) => {
    setMediaWidth(e.nativeEvent.layout.width);
  }, []);

  const onMediaScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (mediaWidth <= 0) return;
      const index = Math.round(e.nativeEvent.contentOffset.x / mediaWidth);
      setActiveIndex((prev) => (prev === index ? prev : index));
    },
    [mediaWidth],
  );

  useEffect(() => {
    void recordAnnouncementView(id);
  }, [id]);

  const onCtaPress = useCallback(() => {
    if (!linkUrl?.trim()) return;
    void recordAnnouncementCtaClick(id);
    openAnnouncementLink(linkUrl);
    onClose();
  }, [id, linkUrl, onClose]);

  const translateY = useSharedValue(0);
  const scrollAtTop = useSharedValue(true);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollAtTop.value = event.nativeEvent.contentOffset.y <= 0;
    },
    [scrollAtTop],
  );

  const dismissPan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetY(-12)
    .onUpdate((event) => {
      'worklet';
      if (!scrollAtTop.value) return;
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      'worklet';
      if (
        scrollAtTop.value &&
        (event.translationY > DISMISS_DRAG_PX || event.velocityY > DISMISS_VELOCITY)
      ) {
        translateY.value = withTiming(
          900,
          { duration: 220, easing: Easing.in(Easing.cubic) },
          (done) => {
            if (done) runOnJS(onClose)();
          },
        );
        return;
      }
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.page, pageStyle, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={dismissPan}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.mediaWrap} onLayout={onMediaLayout}>
          {media.length === 0 ? (
            <LinearGradient
              colors={[accent, `${accent}AA`, '#0B1220']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          ) : mediaWidth > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onMediaScroll}
              scrollEventThrottle={16}
              style={StyleSheet.absoluteFillObject}
            >
              {media.map((item, index) =>
                item.type === 'video' ? (
                  <VideoSlide
                    key={`${item.url}-${index}`}
                    item={item}
                    width={mediaWidth}
                    active={index === activeIndex}
                  />
                ) : (
                  <Pressable
                    key={`${item.url}-${index}`}
                    onPress={() => openViewer(index)}
                    style={{ width: mediaWidth, height: '100%' }}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Resmi büyüt"
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={{ width: mediaWidth, height: '100%' }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                  </Pressable>
                ),
              )}
            </ScrollView>
          ) : null}

          {media[activeIndex]?.type !== 'video' ? (
            <LinearGradient
              colors={['rgba(8,12,20,0.45)', 'rgba(8,12,20,0)']}
              style={styles.topScrim}
              pointerEvents="none"
            />
          ) : null}

          {media.length > 1 ? (
            <View style={styles.dotsRow} pointerEvents="none">
              {media.map((item, index) => (
                <View
                  key={`dot-${item.url}-${index}`}
                  style={[styles.dot, index === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}

          <Pressable
            style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
            onPress={onClose}
            hitSlop={10}
          >
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.authorRow}>
            {authorAvatarUrl ? (
              <Image
                source={{ uri: authorAvatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: accent }]}>
                <Ionicons name="megaphone" size={15} color="#fff" />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="caption" numberOfLines={1} style={styles.authorName}>
                {authorName?.trim() || 'Vora'}
              </Text>
              <Text variant="caption" secondary numberOfLines={1}>
                {formatDate(createdAt)}
              </Text>
            </View>
          </View>

          <Text variant="h2" style={styles.title}>
            {title}
          </Text>

          {body?.trim() ? (
            <Text variant="body" style={[styles.bodyText, { color: colors.text }]}>
              {body.trim()}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      </GestureDetector>

      {linkUrl?.trim() ? (
        <View
          style={[
            styles.ctaBar,
            { paddingBottom: insets.bottom + spacing.sm, backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <Pressable
            style={({ pressed }) => [styles.ctaButton, { backgroundColor: accent }, pressed && { opacity: 0.9 }]}
            onPress={onCtaPress}
          >
            <Text style={styles.ctaButtonText}>{linkLabel?.trim() || 'Detayı aç'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <FullScreenMediaViewer
        urls={mediaUrls}
        visible={viewerIndex !== null}
        startIndex={viewerIndex ?? 0}
        onClose={closeViewer}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mediaWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#0B1220',
  },
  topScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 96,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#fff',
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 26,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
