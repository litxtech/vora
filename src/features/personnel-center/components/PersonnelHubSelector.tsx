import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_HUBS } from '@/features/personnel-center/constants';
import type { PersonnelHub } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PersonnelHubSelectorProps = {
  value: PersonnelHub;
  onChange: (hub: PersonnelHub) => void;
  badgeCounts?: Partial<Record<PersonnelHub, number>>;
  hubs?: typeof PERSONNEL_HUBS;
};

export function PersonnelHubSelector({ value, onChange, badgeCounts, hubs = PERSONNEL_HUBS }: PersonnelHubSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {hubs.map((hub) => {
        const active = value === hub.id;
        const badge = badgeCounts?.[hub.id] ?? 0;
        const accent = hub.id === 'hire' ? colors.accent : colors.primary;

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
            {badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text variant="caption" style={styles.badgeText}>
                  {badge > 9 ? '9+' : badge}
                </Text>
              </View>
            ) : null}
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
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
