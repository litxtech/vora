import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ReporterBenefitsCard } from '@/features/reporter/components/ReporterBenefitsCard';
import { ReporterHeroCard } from '@/features/reporter/components/ReporterHeroCard';
import { ReporterLevelProgressCard } from '@/features/reporter/components/ReporterLevelProgressCard';
import { ReporterLevelsCard } from '@/features/reporter/components/ReporterLevelsCard';
import { ReporterStatusCard } from '@/features/reporter/components/ReporterStatusCard';
import { REPORTER_SCREEN_SUBTITLE } from '@/features/reporter/constants';
import {
  fetchMyReporterApplication,
  fetchReporterLevelProgress,
  submitReporterApplication,
} from '@/features/reporter/services/reporterData';
import type { ReporterApplication, ReporterLevelProgress } from '@/features/reporter/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function isReporterRole(role: string | undefined): boolean {
  return role === 'verified_reporter' || role === 'moderator' || role === 'admin';
}

export function ReporterApplyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [application, setApplication] = useState<ReporterApplication | null>(null);
  const [levelProgress, setLevelProgress] = useState<ReporterLevelProgress | null>(null);
  const [motivation, setMotivation] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setLevelProgress(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchMyReporterApplication(user.id),
      fetchReporterLevelProgress(user.id),
    ])
      .then(([app, progress]) => {
        setApplication(app);
        setLevelProgress(progress);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !motivation.trim()) {
      setError('Motivasyon metni gerekli.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitReporterApplication(user.id, {
      motivation: motivation.trim(),
      experience: experience.trim(),
      regionId: profile?.region_id ?? null,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Başvuru gönderilemedi.');
      return;
    }

    const app = await fetchMyReporterApplication(user.id);
    setApplication(app);
    const progress = await fetchReporterLevelProgress(user.id);
    setLevelProgress(progress);
  };

  const isReporter = isReporterRole(profile?.role);
  const displayLevel = levelProgress?.level ?? profile?.reporter_level ?? 1;
  const showForm =
    !loading &&
    !isReporter &&
    application?.status !== 'pending' &&
    application?.status !== 'rejected';

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={32}
        extraKeyboardSpace={24}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl * 2 },
        ]}
      >
        <AuthHeader title="Muhabir Programı" subtitle={REPORTER_SCREEN_SUBTITLE} showBack />

        <ReporterHeroCard isReporter={isReporter} reporterLevel={displayLevel} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text variant="caption" secondary>
              Başvuru durumu yükleniyor…
            </Text>
          </View>
        ) : (
          <>
            {isReporter ? <ReporterStatusCard variant="reporter" /> : null}
            {application?.status === 'pending' ? (
              <ReporterStatusCard variant="pending" application={application} />
            ) : null}
            {application?.status === 'rejected' ? (
              <ReporterStatusCard variant="rejected" application={application} />
            ) : null}

            <ReporterBenefitsCard />

            {levelProgress ? <ReporterLevelProgressCard progress={levelProgress} /> : null}

            <ReporterLevelsCard progress={levelProgress} />

            {showForm ? (
              <GlassCard style={styles.form}>
                <Text variant="label">Başvuru formu</Text>
                <Text variant="caption" secondary>
                  Kısa ve samimi bir motivasyon metni yeterli. Deneyim alanı isteğe bağlıdır.
                </Text>
                <Input
                  label="Neden muhabir olmak istiyorsunuz?"
                  value={motivation}
                  onChangeText={setMotivation}
                  placeholder="Bölgenizdeki haberleri nasıl doğrulamak istediğinizi yazın…"
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />
                <Input
                  label="Deneyim (opsiyonel)"
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="Gazetecilik, sosyal medya veya yerel haber deneyiminiz"
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />
                {error ? (
                  <Text variant="caption" style={{ color: colors.danger }}>
                    {error}
                  </Text>
                ) : null}
                <Button title="Başvuruyu gönder" onPress={handleSubmit} loading={submitting} />
              </GlassCard>
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
  },
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  form: {
    gap: spacing.md,
    padding: spacing.md,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.sm,
  },
});
