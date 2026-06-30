import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AD_STUDIO_STEPS, type AdStudioStepId } from '@/features/ads/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const ACCENT = '#7C3AED';

type AdStudioStepIndicatorProps = {
  step: AdStudioStepId;
};

export function AdStudioStepIndicator({ step }: AdStudioStepIndicatorProps) {
  const { colors } = useTheme();
  const stepIndex = AD_STUDIO_STEPS.findIndex((item) => item.id === step);
  const progress = (stepIndex + 1) / AD_STUDIO_STEPS.length;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[`${ACCENT}22`, `${colors.surface}00`]}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={[styles.iconRing, { borderColor: `${ACCENT}44` }]}>
            <Ionicons name="megaphone" size={22} color={ACCENT} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="label">Reklam Stüdyosu</Text>
            <Text secondary variant="caption">
              Adım {stepIndex + 1}/{AD_STUDIO_STEPS.length} · {AD_STUDIO_STEPS[stepIndex]?.label}
            </Text>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: `${colors.border}` }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: ACCENT }]} />
        </View>
      </LinearGradient>

      <View style={styles.steps}>
        {AD_STUDIO_STEPS.map((item, index) => {
          const active = item.id === step;
          const done = index < stepIndex;
          return (
            <View key={item.id} style={styles.step}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: active || done ? ACCENT : colors.surfaceElevated,
                    borderColor: active ? ACCENT : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={done ? 'checkmark' : item.icon}
                  size={11}
                  color={active || done ? '#fff' : colors.textMuted}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  heroCopy: { flex: 1, gap: 2 },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  step: { alignItems: 'center' },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
