import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/ui/Text';
import type { LobbyAnnouncement, LobbyAnnouncementTone } from '@/features/app-appearance/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const DISMISSED_KEY_PREFIX = 'lobby_announcement_dismissed:';

type Props = {
  announcements: LobbyAnnouncement[];
  storageKeyPrefix?: string;
};

function toneColor(tone: LobbyAnnouncementTone, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (tone) {
    case 'warning':
      return colors.warning;
    case 'success':
      return colors.success;
    case 'accent':
      return colors.accent;
    default:
      return colors.primary;
  }
}

export function LobbyAnnouncementBanner({ announcements, storageKeyPrefix = DISMISSED_KEY_PREFIX }: Props) {
  const { colors } = useTheme();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const active = useMemo(
    () => announcements.filter((item) => item.enabled && item.title.trim()),
    [announcements],
  );

  useEffect(() => {
    const loadDismissed = async () => {
      const ids = active.filter((item) => item.dismissible).map((item) => item.id);
      if (ids.length === 0) {
        setReady(true);
        return;
      }

      const entries = await Promise.all(
        ids.map(async (id) => {
          const value = await AsyncStorage.getItem(`${storageKeyPrefix}${id}`);
          return value === '1' ? id : null;
        }),
      );

      setDismissedIds(new Set(entries.filter((id): id is string => id !== null)));
      setReady(true);
    };

    void loadDismissed();
  }, [active]);

  const visible = active.filter((item) => !item.dismissible || !dismissedIds.has(item.id));

  if (!ready || visible.length === 0) return null;

  const dismiss = async (id: string) => {
    await AsyncStorage.setItem(`${storageKeyPrefix}${id}`, '1');
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <View style={styles.stack}>
      {visible.map((item) => {
        const accent = toneColor(item.tone, colors);
        return (
          <View
            key={item.id}
            style={[styles.banner, { backgroundColor: `${accent}14`, borderColor: `${accent}44` }]}
          >
            <Ionicons name="information-circle-outline" size={20} color={accent} />
            <View style={styles.textBlock}>
              <Text variant="label" style={{ color: accent }}>
                {item.title}
              </Text>
              {item.message.trim() ? (
                <Text secondary variant="caption" style={styles.message}>
                  {item.message}
                </Text>
              ) : null}
            </View>
            {item.dismissible ? (
              <Pressable
                onPress={() => void dismiss(item.id)}
                hitSlop={8}
                accessibilityLabel="Bilgilendirmeyi kapat"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  message: {
    lineHeight: 18,
  },
});
