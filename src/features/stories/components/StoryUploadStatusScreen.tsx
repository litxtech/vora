import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { STORY_RING_ACTIVE_GRADIENT } from '@/features/stories/constants';
import { StoryUploadProgressRing } from '@/features/stories/components/StoryUploadProgressRing';
import { useStoryUploadStore } from '@/features/stories/store/storyUploadStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const THUMB_SIZE = 72;
const RING_SIZE = 80;

export function StoryUploadStatusScreen() {
  const { colors } = useTheme();

  const status = useStoryUploadStore((s) => s.status);
  const progress = useStoryUploadStore((s) => s.progress);
  const message = useStoryUploadStore((s) => s.message);
  const previewUri = useStoryUploadStore((s) => s.previewUri);
  const mediaType = useStoryUploadStore((s) => s.mediaType);
  const videoUploadActive = useStoryUploadStore((s) => s.videoUploadActive);
  const cancelUpload = useStoryUploadStore((s) => s.cancelUpload);
  const dismiss = useStoryUploadStore((s) => s.dismiss);
  const showBanner = useStoryUploadStore((s) => s.showBanner);

  const isUploading = status === 'uploading' || (status === 'success' && videoUploadActive);
  const isSuccess = status === 'success' && !videoUploadActive;
  const isCancelled = status === 'cancelled';
  const isError = status === 'error';

  useEffect(() => {
    if (status === 'idle') {
      router.back();
    }
  }, [status]);

  const handleBack = useCallback(() => {
    showBanner();
    router.back();
  }, [showBanner]);

  const handleCancel = useCallback(() => {
    Alert.alert('Yüklemeyi iptal et', 'Hikâye yüklemesi durdurulacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal et', style: 'destructive', onPress: cancelUpload },
    ]);
  }, [cancelUpload]);

  const handleDismiss = useCallback(() => {
    dismiss();
    router.back();
  }, [dismiss]);

  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  const title = isUploading
    ? mediaType === 'video'
      ? 'Hikâye videosu yükleniyor'
      : 'Hikâye görseli yükleniyor'
    : isSuccess
      ? 'Hikâyen paylaşıldı'
      : isCancelled
        ? 'Yükleme iptal edildi'
        : 'Paylaşım başarısız';

  const subtitle = isUploading
    ? message || 'Yükleme arka planda devam eder.'
    : isSuccess
      ? 'Hikâyen halkanda görünüyor.'
      : message;

  const statusIcon = isSuccess
    ? 'checkmark-circle'
    : isCancelled
      ? 'close-circle'
      : isError
        ? 'alert-circle'
        : null;
  const statusColor = isSuccess ? colors.success : isError ? colors.danger : colors.textMuted;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.topBtn} accessibilityLabel="Geri">
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </Pressable>
          <Text variant="label">Hikâye yüklemesi</Text>
          <View style={styles.topBtn} />
        </View>

        <View style={styles.body}>
          <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.previewRow}>
              <View style={styles.thumbWrap}>
                {isUploading ? (
                  <StoryUploadProgressRing
                    progress={progress}
                    accent={STORY_RING_ACTIVE_GRADIENT[1]}
                    size={RING_SIZE}
                  />
                ) : null}
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumbFallback, { backgroundColor: colors.border }]}>
                    <Ionicons name="albums-outline" size={24} color={colors.textMuted} />
                  </View>
                )}
              </View>

              <View style={styles.textCol}>
                <Text variant="label" style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="caption" secondary numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
                {isUploading ? (
                  <View style={styles.statusRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="caption" secondary>
                      %{pct}
                    </Text>
                  </View>
                ) : statusIcon ? (
                  <View style={styles.statusRow}>
                    <Ionicons name={statusIcon} size={16} color={statusColor} />
                    <Text variant="caption" style={{ color: statusColor }}>
                      {isSuccess ? 'Tamamlandı' : isCancelled ? 'İptal edildi' : 'Hata'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {isUploading ? (
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${pct}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            ) : null}
          </View>

          {isUploading ? (
            <Text variant="caption" secondary style={styles.hint}>
              Bu ekranı kapatabilirsiniz; yükleme arka planda sürer.
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          {isUploading ? (
            <>
              <Pressable
                onPress={handleBack}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Arka planda devam et"
              >
                <Text variant="label" style={styles.primaryBtnText}>
                  Arka planda devam et
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                style={styles.textBtn}
                accessibilityRole="button"
                accessibilityLabel="Yüklemeyi iptal et"
              >
                <Text variant="label" style={{ color: colors.danger }}>
                  Yüklemeyi iptal et
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleDismiss}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Text variant="label" style={styles.primaryBtnText}>
                Kapat
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    gap: spacing.xs,
  },
  title: {
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  track: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
