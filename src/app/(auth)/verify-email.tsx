import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import {
  completeBusinessRegistration,
  getPendingBusinessRegistration,
} from '@/features/auth/services/registration';
import { sendSignupVerification, verifyEmailOtp } from '@/features/auth/services/emailVerification';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/providers/ThemeProvider';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { email, accountType } = useLocalSearchParams<{ email?: string; accountType?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  if (!email) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <GlassCard style={styles.card}>
            <Text style={{ color: colors.danger }}>E-posta bilgisi bulunamadı.</Text>
            <Button title="Geri Dön" onPress={() => router.replace('/(auth)/register')} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    const { error: resendError } = await sendSignupVerification(email);
    setResendLoading(false);
    if (resendError) setError(resendError);
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    const { error: verifyError } = await verifyEmailOtp(email, code, 'signup');
    if (verifyError) {
      setLoading(false);
      setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
      return;
    }

    const { error: profileError } = await ensureCurrentUserProfile();
    if (profileError) {
      setLoading(false);
      setError(profileError);
      return;
    }

    if (accountType === 'business') {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      const pending = await getPendingBusinessRegistration();
      if (!pending) {
        setLoading(false);
        setError('İşletme kayıt bilgileri bulunamadı. Lütfen kaydı yeniden başlatın.');
        return;
      }

      const { error: businessError } = await completeBusinessRegistration(user.id, pending);
      setLoading(false);

      if (businessError) {
        setError(businessError);
        return;
      }

      router.replace('/(onboarding)/profile-setup' as Href);
      return;
    }

    setLoading(false);
    router.replace('/(onboarding)/profile-setup' as Href);
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        extraKeyboardSpace={16}
      >
        <AuthHeader
          title="E-posta Doğrulama"
          subtitle={`${email} adresine 6 haneli kod gönderildi`}
        />

        <GlassCard>
          <View style={styles.form}>
            <Text secondary>
              Kaydınızı tamamlamak için e-postanıza gelen 6 haneli doğrulama kodunu girin.
            </Text>

            <Input
              label="Doğrulama Kodu"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
            />

            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

            <Button title="Onayla" loading={loading} onPress={handleVerify} />

            <Button
              title={resendLoading ? 'Gönderiliyor...' : 'Kodu Tekrar Gönder'}
              variant="ghost"
              onPress={handleResend}
              disabled={loading || resendLoading}
            />

            <Pressable onPress={() => router.replace('/(auth)/register')} style={styles.link}>
              <Text variant="caption" secondary>
                Kayıt ekranına dön
              </Text>
            </Pressable>
          </View>
        </GlassCard>
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  form: {
    gap: spacing.md,
  },
  link: {
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
});
