import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { sendLoginOtp, verifyLoginOtp } from '@/features/auth/services/loginOtp';
import { navigateAfterSuccessfulLogin } from '@/features/auth/services/postLoginNavigation';
import { clearSkipAutoGuest } from '@/features/auth/services/sessionPolicy';
import { validateEmail } from '@/features/auth/services/validation';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/providers/ThemeProvider';

type Step = 'email' | 'code';

export default function LoginCodeScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: sendError } = await sendLoginOtp(email);
    setLoading(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep('code');
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError(null);

    const { error: verifyError } = await verifyLoginOtp(email, code);
    setLoading(false);

    if (verifyError) {
      setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
      return;
    }

    await clearSkipAutoGuest();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError('Oturum oluşturulamadı.');
      return;
    }

    await navigateAfterSuccessfulLogin(userData.user.id);
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    const { error: sendError } = await sendLoginOtp(email);
    setLoading(false);
    if (sendError) setError(sendError);
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
          title="Kod ile Giriş"
          subtitle={
            step === 'email'
              ? 'E-posta adresinize giriş kodu göndereceğiz'
              : `${email} adresine gönderilen kodu girin`
          }
        />

        <GlassCard>
          {step === 'email' ? (
            <View style={styles.form}>
              <Input
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

              <Button title="Giriş Kodu Gönder" loading={loading} onPress={handleSendCode} />

              <Pressable onPress={() => router.push('/(auth)/login')} style={styles.link}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  E-posta/kullanıcı adı ve şifre ile giriş yap
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Doğrulama Kodu"
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
              />

              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

              <Button title="Giriş Yap" loading={loading} onPress={handleVerifyCode} />

              <Button
                title={loading ? 'Gönderiliyor...' : 'Kodu Tekrar Gönder'}
                variant="ghost"
                onPress={handleResend}
                disabled={loading}
              />

              <Pressable onPress={() => setStep('email')} style={styles.link}>
                <Text variant="caption" secondary>
                  E-postayı değiştir
                </Text>
              </Pressable>
            </View>
          )}
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
  },
  form: {
    gap: spacing.md,
  },
  link: {
    alignItems: 'center',
  },
});
