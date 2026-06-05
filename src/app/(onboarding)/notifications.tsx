import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { OnboardingProgress } from '@/components/auth/OnboardingProgress';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { NOTIFICATION_OPTIONS } from '@/constants/auth';
import { spacing } from '@/constants/theme';
import { useOnboardingStore } from '@/features/auth/store/onboardingStore';

export default function NotificationsScreen() {
  const { notificationPrefs, toggleNotification } = useOnboardingStore();

  const requestPermission = async () => {
    await Notifications.requestPermissionsAsync();
    router.push('/(onboarding)/location');
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <OnboardingProgress currentStep={3} />
        <AuthHeader
          title="Bildirim Tercihleri"
          subtitle="Hangi bildirimleri almak istediğinizi seçin"
        />

        <GlassCard style={styles.card}>
          {NOTIFICATION_OPTIONS.map((option) => (
            <View key={option.id} style={styles.option}>
              <Checkbox
                checked={!!notificationPrefs[option.id]}
                onToggle={() => toggleNotification(option.id)}
                label={
                  <View>
                    <Text variant="label">{option.label}</Text>
                    <Text variant="caption" secondary>
                      {option.description}
                    </Text>
                  </View>
                }
              />
            </View>
          ))}
        </GlassCard>

        <Button title="Bildirim İzni Ver" onPress={requestPermission} />
        <Button title="Şimdilik Geç" variant="ghost" onPress={() => router.push('/(onboarding)/location')} />
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
  card: {
    gap: spacing.lg,
  },
  option: {
    gap: spacing.xs,
  },
});
