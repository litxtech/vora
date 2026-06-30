import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminContentStatusBadge } from '@/features/admin/components/content/AdminContentStatusBadge';
import {
  adminContentPreviewText,
  adminContentStatusLabel,
  adminContentStatusTone,
  adminPostCategoryLabel,
  adminPostHeadline,
  adminPostPreviewUrl,
  adminReelPreviewUrl,
  formatAdminContentDate,
  type AdminContentPreview,
} from '@/features/admin/services/contentPresentation';
import { openReelById } from '@/features/reels/services/reelsNavigation';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminContentPreviewSheetProps = {
  preview: AdminContentPreview | null;
  onClose: () => void;
  onWarn: (id: string) => void;
  onHide: (id: string) => void;
  onRemove: (id: string) => void;
  busyId?: string | null;
};

export function AdminContentPreviewSheet({
  preview,
  onClose,
  onWarn,
  onHide,
  onRemove,
  busyId = null,
}: AdminContentPreviewSheetProps) {
  const { colors } = useTheme();

  if (!preview) return null;

  const isComment = preview.type === 'comment';
  const id = preview.item.id;
  const isBusy = busyId === id;

  const status = preview.type === 'comment' ? 'published' : preview.item.status;
  const author = preview.item.author;
  const createdAt = preview.item.created_at;

  const mediaUrl =
    preview.type === 'post'
      ? adminPostPreviewUrl(preview.item)
      : preview.type === 'reel'
        ? adminReelPreviewUrl(preview.item)
        : preview.item.post?.media_urls?.[0] ?? null;

  const headline =
    preview.type === 'post'
      ? adminPostHeadline(preview.item)
      : preview.type === 'reel'
        ? adminContentPreviewText(preview.item.caption, 200) || 'Reel'
        : adminContentPreviewText(preview.item.content, 200);

  const bodyText =
    preview.type === 'post'
      ? preview.item.content
      : preview.type === 'reel'
        ? preview.item.caption ?? ''
        : preview.item.content;

  const openInApp = () => {
    if (preview.type === 'post') {
      router.push(`/detail/posts/${preview.item.id}` as Href);
    } else if (preview.type === 'reel') {
      openReelById(preview.item.id);
    } else {
      router.push(`/detail/posts/${preview.item.post_id}` as Href);
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="h3">İçerik önizleme</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {mediaUrl ? (
              <View style={styles.mediaWrap}>
                <FeedMediaPreview url={mediaUrl} style={styles.media} resizeMode="cover" />
              </View>
            ) : (
              <View style={[styles.mediaPlaceholder, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons
                  name={preview.type === 'reel' ? 'videocam-outline' : preview.type === 'comment' ? 'chatbubble-outline' : 'document-text-outline'}
                  size={36}
                  color={colors.textMuted}
                />
              </View>
            )}

            <View style={styles.metaRow}>
              <AdminContentStatusBadge
                label={adminContentStatusLabel(status)}
                tone={adminContentStatusTone(status)}
              />
              {preview.type === 'post' ? (
                <AdminContentStatusBadge label={adminPostCategoryLabel(preview.item.category)} tone="primary" />
              ) : null}
              {preview.type === 'reel' ? (
                <AdminContentStatusBadge label="Reel" tone="primary" />
              ) : null}
              {isComment ? <AdminContentStatusBadge label="Yorum" tone="default" /> : null}
            </View>

            <Text variant="label">{headline}</Text>

            {author ? (
              <View style={styles.authorRow}>
                {author.avatar_url ? (
                  <Image source={{ uri: author.avatar_url }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}22` }]}>
                    <Ionicons name="person" size={14} color={colors.primary} />
                  </View>
                )}
                <View style={styles.authorText}>
                  <Text variant="caption" style={{ fontWeight: '700' }}>
                    @{author.username}
                  </Text>
                  {author.full_name ? (
                    <Text secondary variant="caption">
                      {author.full_name}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {bodyText.trim() ? (
              <Text secondary variant="body" style={styles.bodyText}>
                {bodyText}
              </Text>
            ) : null}

            {isComment && preview.item.post ? (
              <View style={[styles.parentPost, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}>
                <Text variant="caption" style={{ fontWeight: '700' }}>
                  Bağlı gönderi
                </Text>
                <Text secondary variant="caption" numberOfLines={3}>
                  {preview.item.post.title?.trim() || preview.item.post.content}
                </Text>
              </View>
            ) : null}

            <View style={styles.stats}>
              {preview.type !== 'comment' ? (
                <Text secondary variant="caption">
                  {preview.item.view_count.toLocaleString('tr-TR')} görüntülenme
                </Text>
              ) : null}
              <Text secondary variant="caption">
                {preview.item.like_count.toLocaleString('tr-TR')} beğeni
              </Text>
              {preview.type === 'post' ? (
                <Text secondary variant="caption">
                  {preview.item.comment_count.toLocaleString('tr-TR')} yorum
                </Text>
              ) : null}
              <Text secondary variant="caption">{formatAdminContentDate(createdAt)}</Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <AdminActionChip label="Uygulamada aç" icon="open-outline" tone="primary" compact onPress={openInApp} />
            <AdminActionChip
              label="Uyar"
              icon="alert-circle-outline"
              tone="warning"
              compact
              loading={isBusy}
              onPress={() => onWarn(id)}
            />
            {!isComment ? (
              <>
                <AdminActionChip
                  label="Gizle"
                  icon="eye-off-outline"
                  compact
                  loading={isBusy}
                  onPress={() => onHide(id)}
                />
                <AdminActionChip
                  label="Kaldır"
                  icon="trash-outline"
                  tone="danger"
                  compact
                  loading={isBusy}
                  onPress={() => onRemove(id)}
                />
              </>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(128,128,128,0.45)',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  mediaWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0A0E14',
  },
  media: {
    width: '100%',
    height: 220,
  },
  mediaPlaceholder: {
    height: 160,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorText: { gap: 1, flex: 1 },
  bodyText: { lineHeight: 22 },
  parentPost: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
