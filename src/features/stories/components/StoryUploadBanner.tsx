import { useEffect, useRef } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { STORY_RING_ACTIVE_GRADIENT } from '@/features/stories/constants';
import { useStoryUploadStore } from '@/features/stories/store/storyUploadStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SUCCESS_DISMISS_MS = 3200;
const ERROR_DISMISS_MS = 5200;
const THUMB_SIZE = 46;
const RING_SIZE = 52;
const RING_STROKE = 3;

function StoryUploadProgressRing({ progress, accent }: { progress: number; accent: string }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  const r = RING_SIZE / 2;
  const normalized = r - RING_STROKE / 2;
  const circumference = normalized * 2 * Math.PI;
  const offset = circumference - pct * circumference;

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
      <Circle
        cx={r}
        cy={r}
        r={normalized}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={RING_STROKE}
        fill="transparent"
      />
      <Circle
        cx={r}
        cy={r}
        r={normalized}
        stroke={accent}
        strokeWidth={RING_STROKE}
        fill="transparent"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${r}, ${r}`}
      />
    </Svg>
  );
}

/** Uygulama genelinde yüzen hikâye yükleme göstergesi — sayfalar arası gezinirken görünür. */
export function StoryUploadBanner() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useStoryUploadStore((s) => s.status);
  const progress = useStoryUploadStore((s) => s.progress);
  const message = useStoryUploadStore((s) => s.message);
  const previewUri = useStoryUploadStore((s) => s.previewUri);
  const mediaType = useStoryUploadStore((s) => s.mediaType);
  const videoUploadActive = useStoryUploadStore((s) => s.videoUploadActive);
  const dismiss = useStoryUploadStore((s) => s.dismiss);

  const handledErrorRef = useRef<string | null>(null);
  const progressSv = useSharedValue(progress);

  useEffect(() => {
    progressSv.value = withSpring(progress, { damping: 18, stiffness: 140 });
  }, [progress, progressSv]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressSv.value * 100)}%`,
  }));

  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const isUploading = status === 'uploading' || (status === 'success' && videoUploadActive);
  const isSuccess = status === 'success' && !videoUploadActive;
  const isError = status === 'error';

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => dismiss(), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, dismiss]);

  useEffect(() => {
    if (!isError) return;
    if (handledErrorRef.current === message) return;
    handledErrorRef.current = message;
    Alert.alert('Hikâye paylaşılamadı', message || 'Lütfen tekrar deneyin.');
    const timer = setTimeout(() => {
      dismiss();
      handledErrorRef.current = null;
    }, ERROR_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isError, message, dismiss]);

  if (status === 'idle') return null;

  const goFeed = () => {
    router.dismissTo('/(tabs)' as Href);
  };

  if (isUploading) {
    const title =
      status === 'success' && videoUploadActive
        ? 'Hikâyen yayında · video yükleniyor'
        : mediaType === 'video'
          ? 'Hikâye videosu yükleniyor'
          : 'Hikâye görseli yükleniyor';

    return (
      <View
        style={[styles.host, { paddingTop: insets.top + spacing.xs }]}
        pointerEvents="box-none"
      >
        <Animated.View entering={FadeInDown.springify().damping(20)} exiting={FadeOutUp.duration(200)}>
          <Pressable onPress={goFeed} accessibilityRole="button" accessibilityLabel={`${title} %${pct}`}>
            <LinearGradient
              colors={[...STORY_RING_ACTIVE_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientShell}
            >
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? 'rgba(18,22,28,0.96)' : 'rgba(255,255,255,0.98)',
                  },
                ]}
              >
                <View style={styles.thumbWrap}>
                  <StoryUploadProgressRing progress={progress} accent={STORY_RING_ACTIVE_GRADIENT[1]} />
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumbFallback, { backgroundColor: colors.border }]}>
                      <Ionicons name="albums-outline" size={18} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                <View style={styles.textCol}>
                  <Text variant="label" style={styles.title} numberOfLines={1}>
                    {title} · %{pct}
                  </Text>
                  <Text variant="caption" secondary numberOfLines={1}>
                    {message || 'Başka sayfalarda gezinebilirsin'}
                  </Text>
                </View>

                <View style={[styles.badge, { backgroundColor: `${STORY_RING_ACTIVE_GRADIENT[0]}22` }]}>
                  <Ionicons name="cloud-upload-outline" size={18} color={STORY_RING_ACTIVE_GRADIENT[0]} />
                </View>
              </View>

              <View style={[styles.track, { backgroundColor: `${colors.primary}18` }]}>
                <Animated.View
                  style={[
                    styles.trackFill,
                    barStyle,
                    { backgroundColor: STORY_RING_ACTIVE_GRADIENT[1] },
                  ]}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const accent = isSuccess ? colors.accent : colors.danger;
  const title = isSuccess ? 'Hikâyen paylaşıldı' : 'Paylaşım başarısız';
  const subtitle = isSuccess ? 'Hikâye halkanda görünüyor' : message;

  return (
    <View style={[styles.host, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
      <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(220)}>
        <Pressable
          style={[
            styles.toast,
            {
              backgroundColor: isDark ? 'rgba(18,22,28,0.96)' : colors.surfaceElevated,
              borderColor: `${accent}44`,
              shadowColor: accent,
            },
          ]}
          onPress={isSuccess ? dismiss : goFeed}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <LinearGradient
            colors={isSuccess ? [...STORY_RING_ACTIVE_GRADIENT] : [`${accent}55`, `${accent}22`]}
            style={styles.toastIcon}
          >
            <Ionicons
              name={isSuccess ? 'checkmark' : 'alert'}
              size={20}
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
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 120,
    paddingHorizontal: spacing.md,
    alignItems: 'stretch',
  },
  gradientShell: {
    borderRadius: radius.xl,
    padding: 1.5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
    borderTopLeftRadius: radius.xl - 1,
    borderTopRightRadius: radius.xl - 1,
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
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderBottomLeftRadius: radius.xl - 1,
    borderBottomRightRadius: radius.xl - 1,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  toastIcon: {
    width: 36,
    height: 36,
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
