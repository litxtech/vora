import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { OnboardingProgress } from '@/components/auth/OnboardingProgress';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { uploadAvatar } from '@/features/auth/services/avatarUpload';
import { useOnboardingStore } from '@/features/auth/store/onboardingStore';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function LocationScreen() {
  const { colors } = useTheme();
  const { user, completeOnboarding } = useAuth();
  const onboarding = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishOnboarding = async () => {
    if (!onboarding.regionId || !onboarding.district) {
      setError('Profil bilgileri eksik. Lütfen geri dönüp şehir ve ilçe seçin.');
      return;
    }

    setLoading(true);
    setError(null);

    let avatarUrl: string | null = null;
    if (onboarding.avatarUri && user?.id) {
      const { url, error: uploadError } = await uploadAvatar(user.id, onboarding.avatarUri);
      if (uploadError) {
        setLoading(false);
        setError('Profil fotoğrafı yüklenemedi. Lütfen tekrar deneyin.');
        return;
      }
      avatarUrl = url;
    }

    const { error: saveError } = await completeOnboarding({
      avatarUrl,
      regionId: onboarding.regionId,
      district: onboarding.district,
      bio: onboarding.bio || undefined,
      occupation: onboarding.occupation || undefined,
      interests: onboarding.interests,
      notificationPrefs: onboarding.notificationPrefs,
    });

    setLoading(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    onboarding.reset();
    router.replace('/(tabs)');
  };

  const requestLocation = async () => {
    await Location.requestForegroundPermissionsAsync();
    await finishOnboarding();
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <OnboardingProgress currentStep={4} />
        <AuthHeader
          title="Konum İzni"
          subtitle="Yakınınızdaki içerikleri keşfedin"
          showBack={false}
        />

        <GlassCard style={styles.card}>
          <Text secondary style={styles.description}>
            Yakınınızdaki olayları ve içerikleri gösterebilmek için konum iznine ihtiyaç duyuyoruz.
            Konum verilmeden de uygulama çalışmaya devam eder.
          </Text>
        </GlassCard>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title="İzin Ver" loading={loading} onPress={requestLocation} />
          <Button title="Şimdilik Geç" variant="secondary" loading={loading} onPress={finishOnboarding} />
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  description: {
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
    marginTop: 'auto',
    paddingBottom: spacing.xl,
  },
});
