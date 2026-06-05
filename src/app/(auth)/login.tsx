import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import {
  clearLoginAttempts,
  getLoginLockoutMessage,
  recordFailedLogin,
} from '@/features/auth/services/loginAttempts';
import { validateEmail } from '@/features/auth/services/validation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { rememberedEmail, saveRememberedEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, [rememberedEmail]);

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!password) {
      setError('Şifre gereklidir.');
      return;
    }

    const lockout = await getLoginLockoutMessage();
    if (lockout) {
      setError(lockout);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      const lockoutMessage = await recordFailedLogin();
      setError(lockoutMessage ?? 'E-posta veya şifre hatalı.');
      return;
    }

    await clearLoginAttempts();
    await saveRememberedEmail(rememberMe ? email.trim() : null);

    const { data: userData } = await supabase.auth.getUser();
    const { data: freshProfile } = userData.user
      ? await supabase
          .from('profiles')
          .select('onboarding_completed, account_status')
          .eq('id', userData.user.id)
          .maybeSingle()
      : { data: null };

    if (freshProfile?.account_status === 'frozen') {
      await supabase.auth.signOut();
      setError('Hesabınız dondurulmuş. Destek ekibiyle iletişime geçin.');
      return;
    }

    if (freshProfile?.onboarding_completed === false) {
      router.replace('/(onboarding)/profile-setup');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Giriş Yap" subtitle="Hesabınıza giriş yapın" />

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
          <Input
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          <View style={styles.row}>
            <Checkbox
              checked={rememberMe}
              onToggle={() => setRememberMe((v) => !v)}
              label="Beni Hatırla"
            />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
              <Text variant="caption" style={{ color: colors.primary }}>
                Şifremi Unuttum
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <Button title="Giriş Yap" loading={loading} onPress={handleLogin} />

          <Pressable onPress={() => router.push('/(auth)/register')} style={styles.link}>
            <Text secondary>Hesabın yok mu? Kayıt ol</Text>
          </Pressable>
        </View>
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
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
