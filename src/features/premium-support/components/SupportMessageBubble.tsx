import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { PREMIUM_GOLD } from '@/features/profile/constants/premiumUi';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type SupportChatBubbleMessage = {
  content: string;
  created_at: string;
  message_type?: 'text' | 'image';
  media_url?: string | null;
  sender_username?: string;
  is_staff?: boolean;
};

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type SupportMessageBubbleProps = {
  message: SupportChatBubbleMessage;
  isMine: boolean;
  senderLabel?: string;
  accentColor?: string;
  staffLabel?: string;
};

export function SupportMessageBubble({
  message,
  isMine,
  senderLabel,
  accentColor = PREMIUM_GOLD,
  staffLabel = 'Premium Destek',
}: SupportMessageBubbleProps) {
  const { colors, isDark } = useTheme();
  const staff = message.is_staff;
  const isImage = message.message_type === 'image' && message.media_url;

  const label =
    senderLabel ??
    (isMine ? 'Siz' : staff ? staffLabel : message.sender_username ?? 'Kullanıcı');

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine
              ? `${accentColor}${isDark ? '33' : '44'}`
              : staff
                ? `${colors.primary}${isDark ? '28' : '18'}`
                : colors.surfaceElevated,
            borderColor: isMine ? `${accentColor}66` : colors.border,
          },
        ]}
      >
        <Text
          variant="caption"
          style={{ color: isMine ? accentColor : colors.primary, fontWeight: '700' }}
        >
          {label}
        </Text>
        {isImage ? (
          <Image source={{ uri: message.media_url! }} style={styles.image} resizeMode="cover" />
        ) : null}
        {message.content.trim().length > 0 ? (
          <Text variant="body">{message.content}</Text>
        ) : null}
        <Text variant="caption" muted>
          {formatMessageTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
