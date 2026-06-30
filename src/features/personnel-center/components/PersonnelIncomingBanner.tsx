import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  pendingCount: number;
  onPress: () => void;
  active?: boolean;
};

export function PersonnelIncomingBanner({ pendingCount, onPress, active }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: active ? `${PERSONNEL_ACCENT}18` : `${PERSONNEL_ACCENT}10`,
          borderColor: active ? PERSONNEL_ACCENT : `${PERSONNEL_ACCENT}44`,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: PERSONNEL_ACCENT }]}>
        <Ionicons name="mail" size={20} color="#fff" />
      </View>
      <View style={styles.copy}>
        <Text variant="label">Gelen Başvurular</Text>
        <Text secondary variant="caption">
          {pendingCount > 0
            ? `${pendingCount} yeni başvuru incelemenizi bekliyor`
            : 'İlanlarınıza gelen başvuruları yönetin'}
        </Text>
      </View>
      {pendingCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text variant="caption" style={styles.badgeText}>
            {pendingCount > 9 ? '9+' : pendingCount}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={PERSONNEL_ACCENT} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
