import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { SavedLoginAccountsSection } from '@/features/auth/components/SavedLoginAccountsSection';
import {
  clearLoginAttempts,
  getLoginLockoutMessage,
  recordFailedLogin,
} from '@/features/auth/services/loginAttempts';
import { navigateAfterSuccessfulLogin } from '@/features/auth/services/postLoginNavigation';
import { clearSkipAutoGuest } from '@/features/auth/services/sessionPolicy';
import { signInWithIdentifier } from '@/features/auth/services/usernameLogin';
import { normalizeLoginIdentifierInput } from '@/features/auth/services/validation';
import type { SavedLoginAccount } from '@/features/auth/types/savedLoginAccounts';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { savedLoginAccounts, rememberLoginAccountAfterSuccess, forgetLoginAccount } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedLoginAccounts.length === 0) {
      setManualEntry(true);
      return;
    }
    setManualEntry(false);
    setLoginId((current) => current || savedLoginAccounts[0]!.loginId);
  }, [savedLoginAccounts]);

  const handleLoginIdChange = (value: string) => {
    setLoginId(normalizeLoginIdentifierInput(value));
  };

  const handleSelectAccount = (account: SavedLoginAccount) => {
    setManualEntry(false);
    setLoginId(account.loginId);
    setPassword('');
    setError(null);
  };

  const handleUseManualEntry = () => {
    setManualEntry(true);
    setLoginId('');
    setPassword('');
    setError(null);
  };

  const handleShowSavedAccounts = () => {
    setManualEntry(false);
    setLoginId('');
    setPassword('');
    setError(null);
  };

  const handleForgetAccount = async (accountLoginId: string) => {
    await forgetLoginAccount(accountLoginId);
    setPassword('');
    setError(null);
    const remaining = savedLoginAccounts.filter((item) => item.loginId !== accountLoginId);
    if (remaining.length === 0) {
      setManualEntry(true);
      setLoginId('');
      return;
    }
    setManualEntry(false);
    setLoginId(remaining[0]!.loginId);
  };

  const handleLogin = async () => {
    const lockout = await getLoginLockoutMessage();
    if (lockout) {
      setError(lockout);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await signInWithIdentifier(loginId, password);

    setLoading(false);

    if (authError) {
      if (authError.includes('hatalı')) {
        const lockoutMessage = await recordFailedLogin();
        setError(lockoutMessage ?? authError);
      } else {
        setError(authError);
      }
      return;
    }

    await clearLoginAttempts();
    await clearSkipAutoGuest();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError('Oturum oluşturulamadı.');
      return;
    }

    await rememberLoginAccountAfterSuccess(loginId, userData.user.id);
    await navigateAfterSuccessfulLogin(userData.user.id);
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Giriş Yap" subtitle="Hesabınıza giriş yapın" />

        <View style={styles.form}>
          <SavedLoginAccountsSection
            savedAccounts={savedLoginAccounts}
            loginId={loginId}
            password={password}
            manualEntry={manualEntry}
            loading={loading}
            error={error}
            onLoginIdChange={handleLoginIdChange}
            onPasswordChange={setPassword}
            onSelectAccount={handleSelectAccount}
            onUseManualEntry={handleUseManualEntry}
            onShowSavedAccounts={handleShowSavedAccounts}
            onForgetAccount={handleForgetAccount}
            onSubmit={handleLogin}
          />

          <Pressable onPress={() => router.push('/(auth)/login-code')} style={styles.link}>
            <Text variant="caption" style={{ color: colors.primary }}>
              Kod ile giriş yap
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.link}>
            <Text variant="caption" style={{ color: colors.primary }}>
              Şifremi Unuttum
            </Text>
          </Pressable>

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
  link: {
    alignItems: 'center',
  },
});
