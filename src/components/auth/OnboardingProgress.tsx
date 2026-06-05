import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STEPS = ['Profil', 'İlgi Alanları', 'Bildirimler', 'Konum'] as const;

type OnboardingProgressProps = {
  currentStep: 1 | 2 | 3 | 4;
};

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {STEPS.map((label, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const done = step < currentStep;

          return (
            <View key={label} style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: active || done ? colors.primary : colors.border,
                    opacity: active ? 1 : done ? 0.7 : 0.4,
                  },
                ]}
              />
              <Text variant="caption" muted={!active}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text variant="caption" muted style={styles.counter}>
        Adım {currentStep} / {STEPS.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  counter: {
    textAlign: 'center',
  },
});
