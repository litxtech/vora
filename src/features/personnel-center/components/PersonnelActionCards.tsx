import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PersonnelActionCardsProps = {
  onCreateJob: () => void;
  onCreateStaff: () => void;
  onEditSeekerProfile?: () => void;
};

export function PersonnelActionCards({
  onCreateJob,
  onCreateStaff,
  onEditSeekerProfile,
}: PersonnelActionCardsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onCreateJob}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: `${colors.primary}12`,
            borderColor: `${colors.primary}44`,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: colors.primary }]}>
          <Ionicons name="briefcase" size={22} color="#fff" />
        </View>
        <View style={styles.text}>
          <Text variant="label">İş İlanı Ver</Text>
          <Text secondary variant="caption">
            Açık pozisyon ilanı oluştur
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </Pressable>

      <Pressable
        onPress={onCreateStaff}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: `${colors.accent}12`,
            borderColor: `${colors.accent}44`,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: colors.accent }]}>
          <Ionicons name="people" size={22} color="#fff" />
        </View>
        <View style={styles.text}>
          <Text variant="label">Personel Talebi</Text>
          <Text secondary variant="caption">
            Acil veya sezonluk personel ara
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </Pressable>

      {onEditSeekerProfile ? (
        <Pressable
          onPress={onEditSeekerProfile}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: `${colors.success}12`,
              borderColor: `${colors.success}44`,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.success }]}>
            <Ionicons name="person-circle" size={22} color="#fff" />
          </View>
          <View style={styles.text}>
            <Text variant="label">İş Arayan Profilim</Text>
            <Text secondary variant="caption">
              Yeteneklerini ve durumunu güncelle
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.success} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
