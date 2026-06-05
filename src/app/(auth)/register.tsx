import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { PolicyCheckboxes } from '@/components/auth/PolicyCheckboxes';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { isUsernameAvailable } from '@/features/auth/services/username';
import {
  formatBirthDateInput,
  parseBirthDate,
  toISODate,
  validateBirthDate,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/services/validation';
import { supabase } from '@/lib/supabase/client';
import { useTheme } from '@/providers/ThemeProvider';

type PolicyState = {
  terms: boolean;
  privacy: boolean;
  childProtection: boolean;
  ageConfirm: boolean;
};

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [policies, setPolicies] = useState<PolicyState>({
    terms: false,
    privacy: false,
    childProtection: false,
    ageConfirm: false,
  });
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePolicyChange = (key: keyof PolicyState, value: boolean) => {
    setPolicies((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    setShowPolicyErrors(true);
    setError(null);

    if (!fullName.trim()) {
      setError('Ad soyad gereklidir.');
      return;
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const birthError = validateBirthDate(birthDate);
    if (birthError) {
      setError(birthError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
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

    if (!policies.terms || !policies.privacy || !policies.childProtection || !policies.ageConfirm) {
      setError('Kayıt için tüm onay kutularını işaretlemeniz gerekiyor.');
      return;
    }

    setLoading(true);

    const available = await isUsernameAvailable(username);
    if (!available) {
      setLoading(false);
      setError('Bu kullanıcı adı zaten kullanılıyor.');
      return;
    }

    const parsedBirth = parseBirthDate(birthDate)!;

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
          birth_date: toISODate(parsedBirth),
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.user) {
      router.replace('/(onboarding)/profile-setup');
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Kayıt Ol" subtitle="18 yaş ve üzeri kullanıcılar için" />

        <View style={styles.form}>
          <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Adınız Soyadınız" />
          <Input
            label="Kullanıcı Adı"
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase())}
            placeholder="kullanici_adi"
            autoCapitalize="none"
            hint="3-30 karakter, harf, rakam ve alt çizgi"
          />
          <Input
            label="Doğum Tarihi"
            value={birthDate}
            onChangeText={(v) => setBirthDate(formatBirthDateInput(v))}
            placeholder="GG.AA.YYYY"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input label="Şifre" value={password} onChangeText={setPassword} placeholder="Min. 8 karakter" secureTextEntry />
          <Input
            label="Şifre Tekrar"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="Şifrenizi tekrar girin"
            secureTextEntry
          />

          <PolicyCheckboxes values={policies} onChange={handlePolicyChange} showErrors={showPolicyErrors} />

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <Button title="Hesap Oluştur" loading={loading} onPress={handleRegister} />

          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.link}>
            <Text secondary>Zaten hesabın var mı? Giriş yap</Text>
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
    paddingBottom: spacing.xxl,
  },
  form: {
    gap: spacing.md,
  },
  link: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
