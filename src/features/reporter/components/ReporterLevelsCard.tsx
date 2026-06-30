import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { REPORTER_LEVEL_DEFS } from '@/features/reporter/constants';
import type { ReporterLevelProgress } from '@/features/reporter/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ReporterLevelsCardProps = {
  progress?: ReporterLevelProgress | null;
};

export function ReporterLevelsCard({ progress }: ReporterLevelsCardProps) {
  const { colors } = useTheme();
  const currentLevel = progress?.level ?? 1;

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.title}>
        Muhabir seviyeleri
      </Text>
      <Text variant="caption" secondary style={styles.subtitle}>
        Her seviye için doğru doğrulama ve güven puanı gerekir.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {REPORTER_LEVEL_DEFS.map((item) => {
          const unlocked = currentLevel >= item.level;
          const active = currentLevel === item.level;
          return (
            <View
              key={item.level}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${colors.primary}18` : colors.surface,
                  borderColor: active ? colors.primary : unlocked ? `${colors.success}55` : colors.border,
                  opacity: unlocked ? 1 : 0.72,
                },
              ]}
            >
              <View style={styles.chipTop}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                {unlocked ? (
                  <Ionicons
                    name={active ? 'radio-button-on' : 'checkmark-circle'}
                    size={14}
                    color={active ? colors.primary : colors.success}
                  />
                ) : (
                  <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
                )}
              </View>
              <Text
                variant="caption"
                style={{ fontWeight: '700', color: active ? colors.primary : colors.text }}
              >
                {item.label}
              </Text>
              <Text variant="caption" secondary style={styles.req} numberOfLines={2}>
                {item.minCorrect > 0
                  ? `${item.minCorrect}+ doğru · ${item.minTrust}+ puan`
                  : 'Muhabir onayı'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    paddingHorizontal: spacing.xs,
  },
  subtitle: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chip: {
    width: 156,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 6,
  },
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  req: {
    lineHeight: 16,
    fontSize: 11,
  },
});
