import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ChatEphemeralExpiredNoticeProps = {
  isMine?: boolean;
  title?: string;
  note?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ChatEphemeralExpiredNotice({
  isMine = false,
  title = 'Süresi bitti',
  note = 'Silindi',
  icon = 'hourglass-outline',
}: ChatEphemeralExpiredNoticeProps) {
  const { colors, isDark } = useTheme();

  const iconColor = isMine ? 'rgba(255,255,255,0.82)' : colors.textSecondary;
  const titleColor = isMine ? 'rgba(255,255,255,0.9)' : colors.textSecondary;
  const noteColor = isMine ? 'rgba(255,255,255,0.55)' : colors.textMuted;

  return (
    <View style={[styles.shell, isMine ? styles.shellMine : styles.shellTheirs]}>
      <BlurView
        intensity={isDark ? 22 : 36}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blur}
      >
        <Ionicons name={icon} size={13} color={iconColor} />
        <View style={styles.copy}>
          <Text variant="caption" style={[styles.title, { color: titleColor }]}>
            {title}
          </Text>
          {note ? (
            <Text variant="caption" style={[styles.note, { color: noteColor }]}>
              {note}
            </Text>
          ) : null}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginVertical: spacing.xs,
  },
  shellMine: {
    alignSelf: 'flex-end',
  },
  shellTheirs: {
    alignSelf: 'flex-start',
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  copy: {
    gap: 1,
  },
  title: {
    fontWeight: '600',
    fontSize: 12,
  },
  note: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.85,
  },
});
