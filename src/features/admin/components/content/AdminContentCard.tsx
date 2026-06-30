import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { GlassCard } from '@/components/ui/GlassCard';
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
} from '@/features/admin/services/contentPresentation';
import type { AdminCommentRow, AdminPostRow, AdminReelRow } from '@/features/admin/services/contentManagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PostCardProps = {
  item: AdminPostRow;
  onPreview: () => void;
  onWarn: () => void;
  onHide: () => void;
  onRemove: () => void;
  busy?: boolean;
};

export function AdminPostContentCard({ item, onPreview, onWarn, onHide, onRemove, busy = false }: PostCardProps) {
  const { colors } = useTheme();
  const previewUrl = adminPostPreviewUrl(item);
  const categoryColor = colors.accent;

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={onPreview} style={styles.header} accessibilityRole="button" accessibilityLabel="İçerik önizle">
        {previewUrl ? (
          <FeedMediaPreview url={previewUrl} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${categoryColor}18` }]}>
            <Ionicons name="document-text-outline" size={24} color={categoryColor} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={2}>
            {adminPostHeadline(item)}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            @{item.author?.username ?? 'bilinmiyor'}
            {item.author?.full_name ? ` · ${item.author.full_name}` : ''}
          </Text>
          <Text secondary variant="caption">
            {formatAdminContentDate(item.created_at)}
          </Text>
        </View>
      </Pressable>

      <View style={styles.badges}>
        <AdminContentStatusBadge
          label={adminContentStatusLabel(item.status)}
          tone={adminContentStatusTone(item.status)}
        />
        <AdminContentStatusBadge label={adminPostCategoryLabel(item.category)} tone="primary" />
      </View>

      <View style={styles.stats}>
        <Text secondary variant="caption">
          {item.view_count.toLocaleString('tr-TR')} görüntülenme
        </Text>
        <Text secondary variant="caption">{item.like_count} beğeni</Text>
        <Text secondary variant="caption">{item.comment_count} yorum</Text>
      </View>

      <Text secondary variant="caption" numberOfLines={2}>
        {adminContentPreviewText(item.content, 100)}
      </Text>

      <View style={styles.actions}>
        <AdminActionChip label="Önizle" icon="eye-outline" tone="primary" compact onPress={onPreview} />
        <AdminActionChip label="Uyar" icon="alert-circle-outline" tone="warning" compact loading={busy} onPress={onWarn} />
        <AdminActionChip label="Gizle" icon="eye-off-outline" compact loading={busy} onPress={onHide} />
        <AdminActionChip label="Kaldır" icon="trash-outline" tone="danger" compact loading={busy} onPress={onRemove} />
      </View>
    </GlassCard>
  );
}

type ReelCardProps = {
  item: AdminReelRow;
  onPreview: () => void;
  onWarn: () => void;
  onHide: () => void;
  onRemove: () => void;
  busy?: boolean;
};

export function AdminReelContentCard({ item, onPreview, onWarn, onHide, onRemove, busy = false }: ReelCardProps) {
  const { colors } = useTheme();
  const previewUrl = adminReelPreviewUrl(item);

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={onPreview} style={styles.header} accessibilityRole="button" accessibilityLabel="Reel önizle">
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="play-circle-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={2}>
            {adminContentPreviewText(item.caption, 80) || 'Reel'}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            @{item.author?.username ?? 'bilinmiyor'}
          </Text>
          <Text secondary variant="caption">{formatAdminContentDate(item.created_at)}</Text>
        </View>
      </Pressable>

      <View style={styles.badges}>
        <AdminContentStatusBadge
          label={adminContentStatusLabel(item.status)}
          tone={adminContentStatusTone(item.status)}
        />
        <AdminContentStatusBadge label="Reel" tone="primary" />
      </View>

      <View style={styles.stats}>
        <Text secondary variant="caption">
          {item.view_count.toLocaleString('tr-TR')} görüntülenme
        </Text>
        <Text secondary variant="caption">{item.like_count} beğeni</Text>
      </View>

      <View style={styles.actions}>
        <AdminActionChip label="Önizle" icon="eye-outline" tone="primary" compact onPress={onPreview} />
        <AdminActionChip label="Uyar" icon="alert-circle-outline" tone="warning" compact loading={busy} onPress={onWarn} />
        <AdminActionChip label="Gizle" icon="eye-off-outline" compact loading={busy} onPress={onHide} />
        <AdminActionChip label="Kaldır" icon="trash-outline" tone="danger" compact loading={busy} onPress={onRemove} />
      </View>
    </GlassCard>
  );
}

type CommentCardProps = {
  item: AdminCommentRow;
  onPreview: () => void;
  onWarn: () => void;
  busy?: boolean;
};

export function AdminCommentContentCard({ item, onPreview, onWarn, busy = false }: CommentCardProps) {
  const { colors } = useTheme();
  const parentPreview = item.post?.title?.trim() || item.post?.content;

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={onPreview} style={styles.commentHeader} accessibilityRole="button" accessibilityLabel="Yorum önizle">
        <View style={[styles.commentIcon, { backgroundColor: `${colors.accent}18` }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={3}>
            {adminContentPreviewText(item.content, 120)}
          </Text>
          <Text secondary variant="caption">
            @{item.author?.username ?? 'bilinmiyor'} · {formatAdminContentDate(item.created_at)}
          </Text>
        </View>
      </Pressable>

      {parentPreview ? (
        <View style={[styles.parentSnippet, { borderColor: colors.border }]}>
          <Text secondary variant="caption" numberOfLines={2}>
            Gönderi: {adminContentPreviewText(parentPreview, 90)}
          </Text>
        </View>
      ) : null}

      <View style={styles.stats}>
        <Text secondary variant="caption">{item.like_count} beğeni</Text>
      </View>

      <View style={styles.actions}>
        <AdminActionChip label="Önizle" icon="eye-outline" tone="primary" compact onPress={onPreview} />
        <AdminActionChip label="Uyar" icon="alert-circle-outline" tone="warning" compact loading={busy} onPress={onWarn} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  commentHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 2, minWidth: 0 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  parentSnippet: {
    borderLeftWidth: 2,
    paddingLeft: spacing.sm,
    borderRadius: radius.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
