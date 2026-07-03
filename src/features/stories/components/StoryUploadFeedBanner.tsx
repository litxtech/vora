import { useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { STORY_RING_ACTIVE_GRADIENT } from '@/features/stories/constants';
import { StoryUploadProgressRing } from '@/features/stories/components/StoryUploadProgressRing';
import { useStoryUploadStore } from '@/features/stories/store/storyUploadStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const DISMISS_DRAG_PX = 48;
const DISMISS_VELOCITY = 650;
const THUMB_SIZE = 40;
const RING_SIZE = 46;

/** Akış ekranında hikâye yükleme kartı — yukarı kaydırarak gizlenebilir. */
export function StoryUploadFeedBanner() {
  const { colors, isDark } = useTheme();
  const status = useStoryUploadStore((s) => s.status);
  const progress = useStoryUploadStore((s) => s.progress);
  const message = useStoryUploadStore((s) => s.message);
  const previewUri = useStoryUploadStore((s) => s.previewUri);
  const mediaType = useStoryUploadStore((s) => s.mediaType);
  const videoUploadActive = useStoryUploadStore((s) => s.videoUploadActive);
  const bannerHidden = useStoryUploadStore((s) => s.bannerHidden);
  const hideBanner = useStoryUploadStore((s) => s.hideBanner);
  const dismiss = useStoryUploadStore((s) => s.dismiss);

  const dragY = useSharedValue(0);

  const isUploading = status === 'uploading' || (status === 'success' && videoUploadActive);
  const isSuccess = status === 'success' && !videoUploadActive;
  const isError = status === 'error' || status === 'cancelled';

  const openStatus = useCallback(() => {
    router.push('/stories/upload-status' as Href);
  }, []);

  const requestHide = useCallback(() => {
    hideBanner();
  }, [hideBanner]);

  const dismissPan = Gesture.Pan()
    .activeOffsetY(-8)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      if (event.translationY < 0) {
        dragY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -DISMISS_DRAG_PX || event.velocityY < -DISMISS_VELOCITY) {
        dragY.value = withTiming(-160, { duration: 180, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(requestHide)();
        });
        return;
      }
      dragY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
    opacity: 1 + dragY.value / 120,
  }));

  if (status === 'idle') return null;
  if (bannerHidden && isUploading) return null;

  if (isUploading) {
    const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
    const title =
      status === 'success' && videoUploadActive
        ? 'Hikâyen yayında · video yükleniyor'
        : mediaType === 'video'
          ? 'Hikâye videosu yükleniyor'
          : 'Hikâye görseli yükleniyor';

    return (
      <Animated.View entering={FadeInDown.springify().damping(20)} exiting={FadeOutUp.duration(200)}>
        <GestureDetector gesture={dismissPan}>
          <Animated.View style={cardStyle}>
            <Pressable
              onPress={openStatus}
              accessibilityRole="button"
              accessibilityLabel={`${title} %${pct}`}
            >
              <LinearGradient
                colors={[...STORY_RING_ACTIVE_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientShell}
              >
                <View
                  style={[
                    styles.card,
                    { backgroundColor: isDark ? 'rgba(18,22,28,0.96)' : 'rgba(255,255,255,0.98)' },
                  ]}
                >
                  <View style={styles.thumbWrap}>
                    <StoryUploadProgressRing
                      progress={progress}
                      accent={STORY_RING_ACTIVE_GRADIENT[1]}
                      size={RING_SIZE}
                    />
                    {previewUri ? (
                      <Image source={{ uri: previewUri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumbFallback, { backgroundColor: colors.border }]}>
                        <Ionicons name="albums-outline" size={16} color={colors.textMuted} />
                      </View>
                    )}
                  </View>

                  <View style={styles.textCol}>
                    <Text variant="label" style={styles.title} numberOfLines={1}>
                      {title} · %{pct}
                    </Text>
                    <Text variant="caption" secondary numberOfLines={1}>
                      {message || 'Durumu görmek için dokunun'}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>

                <View style={[styles.track, { backgroundColor: `${colors.primary}18` }]}>
                  <View
                    style={[
                      styles.trackFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: STORY_RING_ACTIVE_GRADIENT[1],
                      },
                    ]}
                  />
                </View>
              </LinearGradient>
            </Pressable>

            <Text variant="caption" secondary style={styles.swipeHint}>
              Yukarı kaydırarak kapat
            </Text>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  }

  const accent = isSuccess ? colors.accent : colors.danger;
  const title = isSuccess
    ? 'Hikâyen paylaşıldı'
    : status === 'cancelled'
      ? 'Yükleme iptal edildi'
      : 'Paylaşım başarısız';
  const subtitle = isSuccess ? 'Hikâye halkanda görünüyor' : message;

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(220)}>
      <Pressable
        style={[
          styles.toast,
          {
            backgroundColor: isDark ? 'rgba(18,22,28,0.96)' : colors.surfaceElevated,
            borderColor: `${accent}44`,
          },
        ]}
        onPress={isSuccess ? dismiss : openStatus}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient
          colors={isSuccess ? [...STORY_RING_ACTIVE_GRADIENT] : [`${accent}55`, `${accent}22`]}
          style={styles.toastIcon}
        >
          <Ionicons
            name={isSuccess ? 'checkmark' : status === 'cancelled' ? 'close' : 'alert'}
            size={18}
            color={isSuccess ? '#fff' : accent}
          />
        </LinearGradient>

        {previewUri ? <Image source={{ uri: previewUri }} style={styles.toastThumb} /> : null}

        <View style={styles.textCol}>
          <Text variant="label" style={{ color: isSuccess ? colors.text : accent }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" secondary numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            dismiss();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradientShell: {
    borderRadius: radius.lg,
    padding: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  thumbWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  thumbFallback: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontWeight: '800',
  },
  track: {
    height: 4,
    borderBottomLeftRadius: radius.lg - 1,
    borderBottomRightRadius: radius.lg - 1,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  swipeHint: {
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.7,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toastIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastThumb: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
});
