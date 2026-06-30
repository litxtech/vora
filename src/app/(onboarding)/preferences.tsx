import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { OnboardingProgress } from '@/components/auth/OnboardingProgress';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { INTEREST_OPTIONS } from '@/constants/auth';
import { radius, spacing } from '@/constants/theme';
import { useOnboardingStore } from '@/features/auth/store/onboardingStore';
import { useTheme } from '@/providers/ThemeProvider';

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const interests = useOnboardingStore((s) => s.interests);
  const toggleInterest = useOnboardingStore((s) => s.toggleInterest);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <OnboardingProgress currentStep={2} />
        <AuthHeader
          title="İlgi Alanların"
          subtitle="Seçimlerin öneri sistemini kişiselleştirir"
        />

        <View style={styles.grid}>
          {INTEREST_OPTIONS.map((option) => {
            const selected = interests.includes(option.id);
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.card,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? 'rgba(30,136,229,0.12)' : colors.surface,
                  },
                ]}
                onPress={() => toggleInterest(option.id)}
              >
                <Text variant="label">{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button title="Devam Et" onPress={() => router.push('/(onboarding)/notifications')} />
        <Button title="Şimdilik Geç" variant="ghost" onPress={() => router.push('/(onboarding)/notifications')} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    width: '47%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
    justifyContent: 'center',
  },
});
