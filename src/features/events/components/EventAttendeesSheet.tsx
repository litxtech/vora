import { useMemo } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { EventAttendee } from '@/features/events/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EventAttendeesSheetProps = {
  visible: boolean;
  attendees: EventAttendee[];
  onClose: () => void;
};

type AttendeeRow =
  | { type: 'section'; key: string; label: string }
  | { type: 'person'; key: string; attendee: EventAttendee; muted: boolean };

export function EventAttendeesSheet({ visible, attendees, onClose }: EventAttendeesSheetProps) {
  const { colors } = useTheme();

  const listData = useMemo<AttendeeRow[]>(() => {
    const going = attendees.filter((a) => a.status === 'going');
    const maybe = attendees.filter((a) => a.status === 'maybe');
    const rows: AttendeeRow[] = [];

    if (going.length > 0) {
      rows.push({ type: 'section', key: 'going-header', label: `Katılacaklar (${going.length})` });
      for (const a of going) rows.push({ type: 'person', key: `going-${a.userId}`, attendee: a, muted: false });
    }

    if (maybe.length > 0) {
      rows.push({ type: 'section', key: 'maybe-header', label: `Belki katılacaklar (${maybe.length})` });
      for (const a of maybe) rows.push({ type: 'person', key: `maybe-${a.userId}`, attendee: a, muted: true });
    }

    return rows;
  }, [attendees]);

  const renderItem = ({ item }: { item: AttendeeRow }) => {
    if (item.type === 'section') {
      return (
        <Text variant="label" style={styles.section}>
          {item.label}
        </Text>
      );
    }

    const name = item.attendee.fullName ?? item.attendee.username;
    const initials = name.slice(0, 2).toUpperCase();
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
          {item.attendee.avatarUrl ? (
            <Image source={{ uri: item.attendee.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text variant="caption">{initials}</Text>
          )}
        </View>
        <Text secondary={item.muted}>{name}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text variant="h3">Katılımcılar</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <FlatList
            style={styles.list}
            data={listData}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            initialNumToRender={12}
            windowSize={7}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text secondary style={styles.empty}>
                Henüz katılımcı yok.
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  list: {
    maxHeight: 400,
  },
  section: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
