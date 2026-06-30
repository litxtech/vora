import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HOTEL_ACCENT, HOTEL_HUBS } from '@/features/hotel-center/constants';
import type { HotelHub } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: HotelHub;
  onChange: (hub: HotelHub) => void;
  hubs?: typeof HOTEL_HUBS;
};

export function HotelHubSelector({ value, onChange, hubs = HOTEL_HUBS }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {hubs.map((hub) => {
        const active = value === hub.id;
        const accent = hub.id === 'manage' ? HOTEL_ACCENT : colors.primary;

        return (
          <Pressable
            key={hub.id}
            onPress={() => onChange(hub.id)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: active ? `${accent}14` : colors.surfaceElevated,
                borderColor: active ? accent : colors.border,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: active ? accent : colors.surface }]}>
              <Ionicons
                name={hub.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={active ? '#fff' : colors.textMuted}
              />
            </View>
            <Text
              variant="caption"
              style={[styles.label, { color: active ? accent : colors.text, fontWeight: active ? '800' : '600' }]}
              numberOfLines={1}
            >
              {hub.label}
            </Text>
            <Text secondary variant="caption" style={styles.hint} numberOfLines={2}>
              {hub.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: 88,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
  },
  hint: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 13,
    paddingHorizontal: 2,
  },
});
