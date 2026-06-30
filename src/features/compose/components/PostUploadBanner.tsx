import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { usePostUploadStore } from '@/features/compose/store/postUploadStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SUCCESS_DISMISS_MS = 3500;
const ERROR_DISMISS_MS = 5000;

export function PostUploadBanner() {
  const { colors } = useTheme();
  const status = usePostUploadStore((s) => s.status);
  const progress = usePostUploadStore((s) => s.progress);
  const message = usePostUploadStore((s) => s.message);
  const previewUri = usePostUploadStore((s) => s.previewUri);
  const videoUploadActive = usePostUploadStore((s) => s.videoUploadActive);
  const dismiss = usePostUploadStore((s) => s.dismiss);

  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const isUploading = status === 'uploading' || (status === 'success' && videoUploadActive);
  const isSuccess = status === 'success' && !videoUploadActive;
  const isError = status === 'error' || status === 'cancelled';

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => dismiss(), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, dismiss]);

  useEffect(() => {
    if (!isError) return;
    const timer = setTimeout(() => dismiss(), ERROR_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isError, dismiss]);

  if (status === 'idle') return null;

  const handlePress = () => {
    router.push({ pathname: '/compose', params: { resumeUpload: '1' } } as Href);
  };

  const handleDismiss = () => {
    dismiss();
  };

  if (isUploading) {
    const title = `Gönderi yükleniyor · %${pct}`;

    return (
      <Pressable
        style={[
          styles.uploadCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}22` }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <View style={styles.uploadContent}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumbFallback, { backgroundColor: colors.border }]}>
              <Ionicons name="image-outline" size={16} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.textCol}>
            <Text variant="label" style={styles.uploadTitle} numberOfLines={1}>
              {title}
            </Text>
            {message ? (
              <Text variant="caption" secondary numberOfLines={1}>
                {message}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  }

  const accent = isSuccess ? colors.accent : colors.danger;
  const title = isSuccess
    ? 'Gönderi paylaşıldı'
    : status === 'cancelled'
      ? 'Yükleme iptal edildi'
      : message || 'Paylaşım başarısız';
  const subtitle = isSuccess ? 'Gönderin akışta' : null;
  const iconName = isSuccess ? 'checkmark-circle' : status === 'cancelled' ? 'close-circle' : 'alert-circle';

  return (
    <View style={styles.toastHost} pointerEvents="box-none">
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutUp.duration(220)}
        style={styles.toastWrap}
      >
        <Pressable
          style={[
            styles.toast,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: `${accent}55`,
              shadowColor: accent,
            },
          ]}
          onPress={isSuccess ? handleDismiss : handlePress}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <View style={[styles.toastAccent, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={iconName} size={22} color={accent} />
          </View>

          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.toastThumb} />
          ) : null}

          <View style={styles.textCol}>
            <Text variant="label" style={{ color: accent }} numberOfLines={1}>
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
              handleDismiss();
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
  uploadCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  uploadTitle: {
    fontWeight: '700',
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
  thumbFallback: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  toastHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  toastWrap: {
    width: '100%',
    maxWidth: 420,
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
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  toastAccent: {
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
