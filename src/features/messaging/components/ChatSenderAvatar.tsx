import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { isHiddenPublicAccount } from '@/features/account-deletion/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { CHAT_SENDER_AVATAR_SIZE } from '../constants';
import type { MessagingParticipant } from '../types';
import { displayParticipantName, participantAvatarUrl } from '../utils';

type ChatSenderAvatarProps = {
  sender?: MessagingParticipant | null;
  senderId?: string;
  visible?: boolean;
  onPress?: () => void;
};

export const ChatSenderAvatar = memo(function ChatSenderAvatar({
  sender,
  senderId,
  visible = true,
  onPress,
}: ChatSenderAvatarProps) {
  const { colors } = useTheme();
  const size = CHAT_SENDER_AVATAR_SIZE;

  if (!visible) {
    return <View style={[styles.slot, { width: size, height: size }]} />;
  }

  const hidden = isHiddenPublicAccount(sender?.account_status);
  const avatarUrl = participantAvatarUrl(sender);
  const resolvedId = sender?.id ?? senderId;
  const name = displayParticipantName(sender);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (!resolvedId || hidden) return;
    router.push(`/user/${resolvedId}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!resolvedId || hidden}
      hitSlop={6}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceElevated,
        },
      ]}
    >
      {hidden ? (
        <Ionicons name="person-remove-outline" size={14} color={colors.danger} />
      ) : (
        <>
          <Text variant="caption" style={[styles.initials, { color: colors.primary }]}>
            {initials}
          </Text>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={resolvedId}
              transition={120}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  slot: {
    flexShrink: 0,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  initials: {
    fontWeight: '700',
    fontSize: 11,
  },
});
