import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { EmailVerificationSheet } from '@/components/auth/EmailVerificationSheet';
import { PolicyCheckboxes } from '@/components/auth/PolicyCheckboxes';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  allPoliciesAccepted,
  buildPolicyConsents,
  INITIAL_POLICY_STATE,
  type PolicyState,
} from '@/constants/legal';
import { spacing } from '@/constants/theme';
import { convertGuestEmail, finalizeGuestConversion } from '@/features/auth/services/guestAccount';
import { normalizeEmailInput, validateEmail, validatePassword } from '@/features/auth/services/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function ConvertAccountScreen() {
  const { colors } = useTheme();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [policies, setPolicies] = useState<PolicyState>(INITIAL_POLICY_STATE);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePolicyChange = (key: keyof PolicyState, value: boolean) => {
    setPolicies((prev) => ({ ...prev, [key]: value }));
  };

  const handleSendVerification = async () => {
    const normalizedEmail = normalizeEmailInput(email);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: sendError } = await convertGuestEmail(normalizedEmail);

    setLoading(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setEmail(normalizedEmail);
    setSheetVisible(true);
  };

  const handleFinalize = async () => {
    setShowPolicyErrors(true);
    setError(null);

    if (!emailVerified) {
      setError('Önce e-postanızı doğrulayın.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (!allPoliciesAccepted(policies)) {
      setError('Kullanım şartları, gizlilik ve çocuk koruma politikalarını kabul etmeniz gerekiyor.');
      return;
    }

    setLoading(true);

    const { error: convertError } = await finalizeGuestConversion(
      password,
      buildPolicyConsents(),
      { confirmedEmail: normalizeEmailInput(email) },
    );

    setLoading(false);

    if (convertError) {
      setError(convertError);
      return;
    }

    await refreshProfile();
    router.replace('/(tabs)');
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader
          title="Şahsi Hesaba Geç"
          subtitle="Misafir hesabınızı e-posta ve şifre ile kalıcı hesaba dönüştürün"
        />

        <GlassCard>
          <View style={styles.form}>
            <Input
              label="E-posta"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setEmailVerified(false);
              }}
              placeholder="ornek@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!emailVerified}
            />

            {emailVerified ? (
              <Text variant="caption" style={{ color: colors.primary }}>
                E-posta doğrulandı
              </Text>
            ) : (
              <Button title="Doğrula" loading={loading && !sheetVisible} onPress={handleSendVerification} />
            )}

            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 karakter"
              secureTextEntry
              editable={emailVerified}
            />
            <Input
              label="Şifre Tekrar"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="Şifrenizi tekrar girin"
              secureTextEntry
              editable={emailVerified}
            />

            <PolicyCheckboxes values={policies} onChange={handlePolicyChange} showErrors={showPolicyErrors} />

            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

            <Button
              title="Hesabı Oluştur"
              loading={loading && sheetVisible === false && emailVerified}
              disabled={!emailVerified || !allPoliciesAccepted(policies)}
              onPress={handleFinalize}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <EmailVerificationSheet
        visible={sheetVisible}
        email={email.trim()}
        otpType="email_change"
        onClose={() => setSheetVisible(false)}
        onVerified={() => {
          setEmailVerified(true);
          setSheetVisible(false);
        }}
        onResend={async () => convertGuestEmail(email)}
      />
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
});
