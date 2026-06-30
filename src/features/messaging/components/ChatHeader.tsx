import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isHiddenPublicAccount } from '@/features/account-deletion/utils';
import { PremiumCallGateSheet } from '@/features/calls/components/PremiumCallGateSheet';
import { usePremiumOutgoingCall } from '@/features/calls/hooks/usePremiumOutgoingCall';
import { PlatformCharmTick } from '@/features/platform-charm/components/PlatformCharmTick';
import { PioneerBadge } from '@/features/pioneer/components/PioneerBadge';
import { PlatformSupporterTick } from '@/features/platform-support/components/PlatformSupporterTick';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { ConversationDetail } from '../types';
import {
  displayParticipantName,
  formatPresence,
  groupMemberLabel,
  participantAvatarUrl,
} from '../utils';
import { useChatTheme } from '../hooks/useChatTheme';
import { usePresenceClock } from '../hooks/usePresenceClock';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '@/features/messaging/featureFlags';

const TOOLBAR_HEIGHT = 44;
const AVATAR_SIZE = 36;

type ChatHeaderProps = {
  conversation: ConversationDetail;
  typingLabel?: string | null;
  onSearchPress?: () => void;
  onGalleryPress?: () => void;
  onMenuPress?: () => void;
  hideCalls?: boolean;
};

function HeaderAction({
  icon,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}) {
  if (!onPress) return null;
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} hitSlop={6}>
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function ChatHeader({
  conversation,
  typingLabel,
  onSearchPress,
  onGalleryPress,
  onMenuPress,
  hideCalls = false,
}: ChatHeaderProps) {
  const { colors } = useTheme();
  const chat = useChatTheme();
  const presenceClock = usePresenceClock();
  const showChatSearch = useFeatureVisible(MESSAGING_FEATURE.chatSearch);
  const showChatGallery = useFeatureVisible(MESSAGING_FEATURE.chatGallery);
  const showAudioCall = useFeatureVisible(MESSAGING_FEATURE.chatAudioCall);
  const showVideoCall = useFeatureVisible(MESSAGING_FEATURE.chatVideoCall);
  const showChatMenu = useFeatureVisible(MESSAGING_FEATURE.chatMenu);
  const showGroupInfo = useFeatureVisible(MESSAGING_FEATURE.chatGroupInfo);
  const { initiateOutgoingCall, gateVisible, gateCallType, closeGate } = usePremiumOutgoingCall();
  const isGroup = conversation.type === 'group';
  const otherUser = conversation.otherUser;
  const otherAvatarUrl = participantAvatarUrl(otherUser);

  const title = isGroup
    ? (conversation.title ?? 'Grup Sohbeti')
    : displayParticipantName(conversation.otherUser);

  const presence = conversation.otherUser
    ? formatPresence(
        conversation.otherUser.last_seen_at,
        conversation.otherUser.is_online,
        conversation.otherUser.last_active_at,
      )
    : null;
  void presenceClock;

  const subtitle = typingLabel
    ? typingLabel
    : isGroup
      ? groupMemberLabel(conversation.memberCount)
      : presence
        ? presence.label
        : conversation.type;

  const presenceColor =
    presence?.tone === 'online'
      ? colors.success
      : presence?.tone === 'recent'
        ? colors.warning
        : colors.textMuted;

  const handleHeaderPress = () => {
    if (isGroup) {
      router.push(`/chat/${conversation.id}/group`);
      return;
    }
    if (conversation.otherUser) {
      router.push(`/user/${conversation.otherUser.id}`);
    }
  };

  const handleCall = (callType: 'audio' | 'video') => {
    if (!conversation.otherUser) return;
    void initiateOutgoingCall(conversation.otherUser.id, callType);
  };

  return (
    <>
      <View style={[styles.shell, { backgroundColor: chat.screenBg }]}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={6}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>

        <Pressable style={styles.center} onPress={handleHeaderPress}>
          {isGroup ? (
            <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
              {conversation.avatarUrl ? (
                <Image source={{ uri: conversation.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="people" size={18} color={colors.primary} />
              )}
            </View>
          ) : otherUser ? (
            <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
              {isHiddenPublicAccount(otherUser.account_status) ? (
                <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
              ) : otherAvatarUrl ? (
                <Image source={{ uri: otherAvatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text variant="label" style={{ color: colors.primary }}>
                  {displayParticipantName(otherUser).slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
          ) : null}
          <View style={styles.titleBlock}>
            <View style={styles.nameRow}>
              <Text variant="label" numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {!isGroup && conversation.otherUser?.is_verified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              ) : null}
              {!isGroup && conversation.otherUser?.is_platform_charm ? (
                <PlatformCharmTick gender={conversation.otherUser.gender} />
              ) : null}
              {!isGroup && conversation.otherUser?.is_pioneer ? <PioneerBadge compact /> : null}
              {!isGroup && conversation.otherUser?.is_platform_supporter ? (
                <PlatformSupporterTick />
              ) : null}
            </View>
            <View style={styles.subtitleRow}>
              {!isGroup && presence && !typingLabel ? (
                <View style={[styles.presenceDot, { backgroundColor: presenceColor }]} />
              ) : null}
              <Text
                variant="caption"
                numberOfLines={1}
                style={{ color: typingLabel ? colors.primary : colors.textSecondary }}
              >
                {subtitle}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <HeaderAction
            icon="search-outline"
            color={colors.textSecondary}
            onPress={showChatSearch ? onSearchPress : undefined}
          />
          <HeaderAction
            icon="images-outline"
            color={colors.textSecondary}
            onPress={showChatGallery ? onGalleryPress : undefined}
          />
          {!isGroup && conversation.otherUser && !hideCalls ? (
            <>
              <HeaderAction
                icon="call-outline"
                color={colors.primary}
                onPress={showAudioCall ? () => handleCall('audio') : undefined}
              />
              <HeaderAction
                icon="videocam-outline"
                color={colors.accent}
                onPress={showVideoCall ? () => handleCall('video') : undefined}
              />
            </>
          ) : null}
          {isGroup && showGroupInfo ? (
            <HeaderAction icon="information-circle-outline" color={colors.primary} onPress={handleHeaderPress} />
          ) : null}
          <HeaderAction
            icon="ellipsis-vertical"
            color={colors.textSecondary}
            onPress={showChatMenu ? onMenuPress : undefined}
          />
        </View>
      </View>
      <PremiumCallGateSheet visible={gateVisible} callType={gateCallType} onClose={closeGate} />
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: TOOLBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  back: {
    width: 36,
    height: TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  titleBlock: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
