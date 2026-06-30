import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { validatePassword } from '@/features/auth/services/validation';
import { supabaseErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/providers/ThemeProvider';

type Step = 'verify' | 'password' | 'success';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<Step>('verify');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async () => {
    if (!email) {
      setError('E-posta bilgisi bulunamadı.');
      return;
    }
    if (code.length < 6) {
      setError('6 haneli doğrulama kodunu girin.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });

    setLoading(false);

    if (verifyError) {
      setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
      return;
    }

    setStep('password');
  };

  const handleSetPassword = async () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(supabaseErrorMessage(updateError) ?? 'Şifre güncellenemedi.');
      return;
    }

    setStep('success');
  };

  if (step === 'success') {
    return (
      <GradientBackground>
        <View style={styles.success}>
          <GlassCard style={styles.successCard}>
            <Text variant="h2" style={styles.successTitle}>
              Şifreniz Güncellendi
            </Text>
            <Text secondary style={styles.successText}>
              Yeni şifrenizle giriş yapabilirsiniz.
            </Text>
            <Button title="Giriş Yap" onPress={() => router.replace('/(auth)/login')} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        extraKeyboardSpace={16}
      >
        <AuthHeader
          title={step === 'verify' ? 'Kodu Doğrula' : 'Yeni Şifre'}
          subtitle={email ? `${email} adresine gönderilen kod` : undefined}
        />

        <GlassCard>
          {step === 'verify' ? (
            <View style={styles.form}>
              <Input
                label="Doğrulama Kodu"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
              <Button title="Kodu Doğrula" loading={loading} onPress={handleVerifyCode} />
            </View>
          ) : (
            <View style={styles.form}>
              <Input label="Yeni Şifre" value={password} onChangeText={setPassword} secureTextEntry />
              <Input label="Yeni Şifre Tekrar" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
              <Button title="Şifreyi Kaydet" loading={loading} onPress={handleSetPassword} />
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
  success: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successCard: {
    gap: spacing.md,
  },
  successTitle: {
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
