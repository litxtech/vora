import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useChatTheme } from '../hooks/useChatTheme';
import type { ConversationListItem } from '../types';
import { conversationAvatar, conversationTitle, formatConversationDraftPreview, formatMessageTime, groupMemberLabel } from '../utils';

type ConversationRowProps = {
  item: ConversationListItem;
  unreadCount?: number;
  draftText?: string | null;
  onPress: () => void;
  onPressIn?: () => void;
  onLongPress?: () => void;
  subtitlePrefix?: string;
};

export const ConversationRow = memo(function ConversationRow({
  item,
  unreadCount,
  draftText,
  onPress,
  onPressIn,
  onLongPress,
  subtitlePrefix,
}: ConversationRowProps) {
  const { colors } = useTheme();
  const chat = useChatTheme();
  const title = conversationTitle(item);
  const avatar = conversationAvatar(item);
  const isGroup = item.type === 'group';
  const effectiveUnread = unreadCount ?? item.unreadCount;
  const hasUnread = effectiveUnread > 0;
  const hasDraft = Boolean(draftText?.trim());
  const draftPreview = hasDraft ? formatConversationDraftPreview(draftText!) : null;
  const initials = title
    .replace('@', '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      style={[
        styles.row,
        {
          backgroundColor: hasUnread ? chat.rowUnreadBg : chat.rowBg,
          borderColor: item.isPinned ? colors.primary : chat.rowBorder,
        },
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onLongPress={onLongPress}
      {...getAndroidInstantPressableProps()}
    >
      <View style={[styles.avatarRing, item.isPinned ? { borderColor: colors.primary } : null]}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
          {avatar ? (
            <OptimizedImage
              uri={avatar}
              tier="avatar"
              layoutWidth={46}
              recyclingKey={item.id}
              style={styles.avatarImage}
              transition={0}
            />
          ) : isGroup ? (
            <Ionicons name="people" size={22} color={colors.primary} />
          ) : (
            <Text variant="label" style={{ color: colors.primary }}>
              {initials}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            {item.isPinned ? <Ionicons name="pin" size={12} color={colors.primary} /> : null}
            {isGroup ? <Ionicons name="people-outline" size={13} color={colors.textMuted} /> : null}
            <Text
              variant="label"
              numberOfLines={1}
              style={[styles.title, hasUnread ? styles.titleUnread : null]}
            >
              {title}
            </Text>
            {item.isMuted ? <Ionicons name="volume-mute" size={13} color={colors.textMuted} /> : null}
          </View>
          {item.lastMessageAt ? (
            <Text
              variant="caption"
              style={{ color: hasUnread ? colors.primary : colors.textMuted, fontWeight: hasUnread ? '600' : '400' }}
            >
              {formatMessageTime(item.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              hasDraft
                ? { color: '#25A366', fontStyle: 'italic' }
                : { color: hasUnread ? colors.text : colors.textSecondary },
              hasUnread && !hasDraft ? styles.previewUnread : null,
            ]}
          >
            {subtitlePrefix}
            {draftPreview ??
              item.lastMessagePreview ??
              (isGroup ? groupMemberLabel(item.memberCount) : 'Henüz mesaj yok')}
          </Text>
          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text variant="caption" style={styles.badgeText}>
                {effectiveUnread > 99 ? '99+' : effectiveUnread}
              </Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarRing: {
    padding: 2,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
    fontSize: 14,
  },
  previewUnread: {
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
});
