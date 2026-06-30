import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  isVoraOfficialNotification,
  VORA_NOTIFICATION_SENDER,
} from '@/features/notifications/constants/branding';
import type { NotificationActorProfile } from '@/features/notifications/services/notificationActorProfiles';
import {
  EVENT_ICONS,
  getCategoryLabel,
  getContentPreview,
  getEventLabel,
  getImageUrl,
  getNotificationAccent,
  getNotificationActionLabel,
  getNotificationBody,
  getNotificationDetailLines,
  getNotificationTitle,
  getPriorityLabel,
  isEmergencyNotification,
} from '@/features/notifications/utils/notificationCardMeta';
import type { AppNotification } from '@/lib/notifications/types';
import { formatFeedTime } from '@/features/feed/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const VORA_APP_ICON = require('../../../../assets/icon-ios.png');

type Props = {
  item: AppNotification;
  actor?: NotificationActorProfile | null;
  onPress: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
  footer?: React.ReactNode;
};

export function NotificationInboxCard({
  item,
  actor,
  onPress,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onLongPress,
  footer,
}: Props) {
  const { colors } = useTheme();
  const accent = getNotificationAccent(item, colors.primary);
  const unread = !item.readAt;
  const emergency = isEmergencyNotification(item);
  const official = isVoraOfficialNotification(item.data, item.eventType);
  const detailLines = getNotificationDetailLines(item);
  const contentPreview = getContentPreview(item);
  const imageUrl = getImageUrl(item.data);
  const priorityLabel = getPriorityLabel(item.priority);
  const actionLabel = getNotificationActionLabel(item);
  const body = getNotificationBody(item);
  const notificationTitle = getNotificationTitle(item);

  const headline = official
    ? VORA_NOTIFICATION_SENDER
    : actor?.fullName ?? (actor?.username ? `@${actor.username}` : notificationTitle);
  const subheadline = official ? getEventLabel(item.eventType) : getEventLabel(item.eventType);
  const showTitleLine = official || (!!actor && notificationTitle !== headline);

  return (
    <Pressable
      onPress={selectionMode ? onToggleSelect : onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${notificationTitle}. ${body}`}
      accessibilityState={{ selected: selectionMode ? selected : undefined }}
    >
      <GlassCard
        padded={false}
        style={[
          styles.cardShell,
          {
            borderColor: selectionMode && selected ? colors.primary : unread ? `${accent}55` : colors.border,
            backgroundColor: emergency ? `${accent}0D` : unread ? `${accent}06` : undefined,
          },
        ]}
      >
        <View style={styles.cardInner}>
          {selectionMode ? (
            <View style={styles.selectionSlot}>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={selected ? colors.primary : colors.textSecondary}
              />
            </View>
          ) : null}

          <View style={[styles.accentBar, { backgroundColor: accent }]} />

          <View style={styles.main}>
            <View style={styles.topRow}>
              <View style={styles.avatarSlot}>
                {official ? (
                  <Image source={VORA_APP_ICON} style={styles.avatar} contentFit="cover" />
                ) : actor?.avatarUrl ? (
                  <Image source={{ uri: actor.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: `${accent}20` }]}>
                    <Ionicons
                      name={EVENT_ICONS[item.eventType] ?? 'notifications'}
                      size={22}
                      color={accent}
                    />
                  </View>
                )}
              </View>

              <View style={styles.topCopy}>
                <View style={styles.titleLine}>
                  <Text variant="label" numberOfLines={2} style={styles.headline}>
                    {headline}
                  </Text>
                  <Text variant="caption" secondary style={styles.time}>
                    {formatFeedTime(item.createdAt)}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: `${accent}16` }]}>
                    <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                      {getCategoryLabel(item.category)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${colors.textMuted}14` }]}>
                    <Text variant="caption" secondary style={{ fontWeight: '600' }}>
                      {subheadline}
                    </Text>
                  </View>
                  {priorityLabel ? (
                    <View style={[styles.badge, { backgroundColor: `${accent}20` }]}>
                      <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                        {priorityLabel}
                      </Text>
                    </View>
                  ) : null}
                  {unread ? <View style={[styles.unreadDot, { backgroundColor: accent }]} /> : null}
                </View>
              </View>
            </View>

            {showTitleLine ? (
              <Text variant="label" style={styles.notificationTitle}>
                {notificationTitle}
              </Text>
            ) : null}

            <Text variant="body" secondary style={styles.body}>
              {body}
            </Text>

            {contentPreview ? (
              <View style={[styles.quoteBox, { backgroundColor: `${accent}0A`, borderColor: `${accent}24` }]}>
                <Ionicons name="chatbox-ellipses-outline" size={14} color={accent} />
                <Text variant="caption" secondary style={styles.quoteText}>
                  {contentPreview}
                </Text>
              </View>
            ) : null}

            {detailLines.length > 0 ? (
              <View style={[styles.detailsBox, { backgroundColor: `${colors.textMuted}08`, borderColor: colors.border }]}>
                {detailLines.map((line) => (
                  <View key={`${line.label}-${line.value}`} style={styles.detailRow}>
                    <Ionicons name={line.icon} size={14} color={accent} style={styles.detailIcon} />
                    <Text variant="caption" secondary style={styles.detailLabel}>
                      {line.label}
                    </Text>
                    <Text variant="caption" numberOfLines={2} style={styles.detailValue}>
                      {line.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImage} contentFit="cover" />
            ) : null}

            {footer ?? (
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                  {actionLabel}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={accent} />
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.94 },
  cardShell: {
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  selectionSlot: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatarSlot: {
    paddingTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headline: {
    flex: 1,
    minWidth: 0,
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  notificationTitle: {
    marginTop: 2,
  },
  body: {
    lineHeight: 22,
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  quoteText: {
    flex: 1,
    lineHeight: 18,
  },
  detailsBox: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailIcon: {
    marginTop: 1,
  },
  detailLabel: {
    width: 72,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    minWidth: 0,
  },
  previewImage: {
    width: '100%',
    height: 148,
    borderRadius: radius.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
});
