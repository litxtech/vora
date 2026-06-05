import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { validateEmail } from '@/features/auth/services/validation';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/providers/ThemeProvider';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    router.push({
      pathname: '/(auth)/reset-password',
      params: { email: email.trim() },
    });
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader
          title="Şifremi Unuttum"
          subtitle="E-posta adresinize doğrulama kodu göndereceğiz"
        />

        <GlassCard>
          <Text secondary style={styles.info}>
            Kayıtlı e-posta adresinizi girin. Size 6 haneli bir doğrulama kodu göndereceğiz.
          </Text>

          <View style={styles.form}>
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

            <Button title="Doğrulama Kodu Gönder" loading={loading} onPress={handleSendCode} />
          </View>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  info: {
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
});
