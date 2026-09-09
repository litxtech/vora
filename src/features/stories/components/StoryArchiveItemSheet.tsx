import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';
import { saveUriToGallery } from '@/features/compose/services/saveMediaToGallery';
import { useStoryMuxPlaybackUrl } from '@/features/stories/hooks/useStoryMuxPlaybackUrl';
import { cacheStoryArchiveMedia } from '@/features/stories/services/storyArchiveMedia';
import { useStoryPublishStore } from '@/features/stories/store/storyPublishStore';
import type { StoryArchiveItem } from '@/features/stories/types';
import {
  formatStoryArchiveDateTime,
  formatStoryArchiveRelative,
} from '@/features/stories/utils/formatStoryArchiveDate';
import { STORY_ARCHIVE_ACCENT } from '@/features/stories/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryArchiveItemSheetProps = {
  item: StoryArchiveItem | null;
  visible: boolean;
  onClose: () => void;
};

export function StoryArchiveItemSheet({ item, visible, onClose }: StoryArchiveItemSheetProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [busy, setBusy] = useState<'download' | 'reshare' | null>(null);
  const { playbackUrl, isProcessing } = useStoryMuxPlaybackUrl(
    item?.mediaType === 'video' ? item.mediaUrl : null,
  );

  const previewHeight = Math.min(height * 0.52, width * 1.35);

  const handleDownload = async () => {
    if (!item || busy) return;
    setBusy('download');
    try {
      const cached = await cacheStoryArchiveMedia(item.mediaUrl, item.mediaType, item.id);
      if (cached.error || !cached.localUri) {
        Alert.alert('İndirilemedi', cached.error ?? 'Galeriye kaydedilemedi.');
        return;
      }

      const result = await saveUriToGallery(
        cached.localUri,
        item.mediaType === 'video' ? 'video' : 'photo',
      );
      if (result.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Kaydedildi',
          item.mediaType === 'video' ? 'Video galerinize indirildi.' : 'Fotoğraf galerinize indirildi.',
        );
      } else {
        Alert.alert('İndirilemedi', result.error ?? 'Galeriye kaydedilemedi.');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleReshare = async () => {
    if (!item || busy) return;
    setBusy('reshare');
    try {
      const cached = await cacheStoryArchiveMedia(item.mediaUrl, item.mediaType, item.id);
      if (cached.error || !cached.localUri) {
        Alert.alert('Paylaşılamadı', cached.error ?? 'Medya hazırlanamadı.');
        return;
      }

      useStoryPublishStore.getState().setDraft({
        mediaUri: cached.localUri,
        mediaType: item.mediaType,
        durationSec: item.durationSec ?? undefined,
        trimmedInStudio: item.mediaType === 'video',
      });

      onClose();
      router.push('/stories/publish' as Href);
    } finally {
      setBusy(null);
    }
  };

  if (!item) return null;

  const videoUri = playbackUrl ?? item.mediaUrl;
  const showVideoProcessing = item.mediaType === 'video' && isProcessing;

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType()} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.preview, { height: previewHeight, backgroundColor: '#000' }]}>
            {item.mediaType === 'image' ? (
              <Image
                source={{ uri: item.thumbUrl ?? item.mediaUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
              />
            ) : showVideoProcessing ? (
              <View style={styles.processing}>
                <ActivityIndicator color="#fff" />
                <Text variant="caption" style={styles.processingText}>
                  Video hazırlanıyor…
                </Text>
              </View>
            ) : (
              <CapturedVideoPreview
                uri={videoUri}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                muted
              />
            )}

            {item.isActive ? (
              <View style={styles.activeBadge}>
                <Text variant="caption" style={styles.activeBadgeText}>
                  Yayında
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.meta}>
            <Text variant="h3">{formatStoryArchiveDateTime(item.createdAt)}</Text>
            <Text secondary variant="caption">
              {formatStoryArchiveRelative(item.createdAt)}
              {item.viewCount > 0 ? ` · ${item.viewCount} görüntülenme` : ''}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={() => void handleDownload()}
              disabled={busy != null || showVideoProcessing}
            >
              {busy === 'download' ? (
                <ActivityIndicator color={STORY_ARCHIVE_ACCENT} />
              ) : (
                <Ionicons name="download-outline" size={22} color={STORY_ARCHIVE_ACCENT} />
              )}
              <Text variant="body" style={{ color: STORY_ARCHIVE_ACCENT }}>
                Galeriye indir
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: STORY_ARCHIVE_ACCENT }]}
              onPress={() => void handleReshare()}
              disabled={busy != null || showVideoProcessing}
            >
              {busy === 'reshare' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
              )}
              <Text variant="body" style={styles.primaryBtnText}>
                Yeniden paylaş
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Text secondary variant="body">
              Kapat
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
  },
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  processing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  processingText: {
    color: 'rgba(255,255,255,0.75)',
  },
  activeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  meta: {
    gap: 4,
  },
  actions: {
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  primaryBtn: {
    borderWidth: 0,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
