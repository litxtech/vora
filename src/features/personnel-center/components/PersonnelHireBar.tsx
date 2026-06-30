import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PersonnelHireBarProps = {
  onCreateJob: () => void;
  onCreateStaff: () => void;
  showCreateJob?: boolean;
  showCreateStaff?: boolean;
};

export function PersonnelHireBar({
  onCreateJob,
  onCreateStaff,
  showCreateJob = true,
  showCreateStaff = true,
}: PersonnelHireBarProps) {
  const { colors } = useTheme();

  if (!showCreateJob && !showCreateStaff) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="caption" secondary style={styles.lead}>
        İlanınızı buradan açın — başvuruları Başvurular sekmesinden yönetin.
      </Text>
      <View style={styles.row}>
        {showCreateJob ? (
          <Pressable
            onPress={onCreateJob}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="briefcase" size={18} color="#fff" />
            <Text variant="caption" style={styles.btnText}>
              İş İlanı Ver
            </Text>
          </Pressable>
        ) : null}

        {showCreateStaff ? (
          <Pressable
            onPress={onCreateStaff}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="people" size={18} color="#fff" />
            <Text variant="caption" style={styles.btnText}>
              Personel Talebi
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lead: {
    textAlign: 'center',
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
