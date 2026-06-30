import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { PolicyCheckboxes } from '@/components/auth/PolicyCheckboxes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  allPoliciesAccepted,
  INITIAL_POLICY_STATE,
  type PolicyState,
} from '@/constants/legal';
import { GENDER_OPTIONS, type GenderId } from '@/constants/registration';
import { USERNAME_FORMAT_HINT, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/constants/auth';
import { spacing } from '@/constants/theme';
import { signUpPersonal, resolveSignupFlow } from '@/features/auth/services/registration';
import { isUsernameAvailable } from '@/features/auth/services/username';
import {
  formatBirthDateInput,
  parseBirthDate,
  toISODate,
  validateOptionalBirthDate,
  validateEmail,
  validatePassword,
  validateTurkishName,
  validateUsername,
  normalizeUsernameInput,
} from '@/features/auth/services/validation';
import { useTheme } from '@/providers/ThemeProvider';

export function PersonalRegisterForm() {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderId | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [policies, setPolicies] = useState<PolicyState>(INITIAL_POLICY_STATE);
  const [showPolicyErrors, setShowPolicyErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setShowPolicyErrors(true);
    setError(null);

    const firstNameError = validateTurkishName(firstName, 'Ad');
    if (firstNameError) { setError(firstNameError); return; }

    const lastNameError = validateTurkishName(lastName, 'Soyad');
    if (lastNameError) { setError(lastNameError); return; }

    const usernameError = validateUsername(username);
    if (usernameError) { setError(usernameError); return; }

    const birthError = validateOptionalBirthDate(birthDate);
    if (birthError) { setError(birthError); return; }

    const emailError = validateEmail(email);
    if (emailError) { setError(emailError); return; }

    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }

    if (password !== passwordConfirm) { setError('Şifreler eşleşmiyor.'); return; }

    if (!allPoliciesAccepted(policies)) {
      setError('Kullanım şartları, gizlilik ve çocuk koruma politikalarını kabul etmeniz gerekiyor.');
      return;
    }

    setLoading(true);

    const available = await isUsernameAvailable(username);
    if (!available) {
      setLoading(false);
      setError('Bu kullanıcı adı zaten kullanılıyor.');
      return;
    }

    const parsedBirth = birthDate.trim() ? parseBirthDate(birthDate) : null;

    const signupResult = await signUpPersonal({
      firstName,
      lastName,
      username,
      birthDate: parsedBirth ? toISODate(parsedBirth) : null,
      gender: gender ?? null,
      email,
      password,
    });

    const flow = await resolveSignupFlow(email, signupResult);
    setLoading(false);

    if (!flow.success) {
      setError(flow.error);
      return;
    }

    if (flow.redirectToVerify) {
      router.replace(
        `/(auth)/verify-email?email=${encodeURIComponent(email.trim())}&accountType=personal` as Href,
      );
    }
  };

  return (
    <View style={styles.form}>
      <Input label="Ad" value={firstName} onChangeText={setFirstName} placeholder="Adınız" autoCapitalize="words" />
      <Input label="Soyad" value={lastName} onChangeText={setLastName} placeholder="Soyadınız" autoCapitalize="words" />
      <Input
        label="Kullanıcı Adı"
        value={username}
        onChangeText={(v) => setUsername(normalizeUsernameInput(v))}
        placeholder="kullanici_adi"
        autoCapitalize="none"
        hint={`${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} karakter, ${USERNAME_FORMAT_HINT}`}
      />
      <Input
        label="Doğum Tarihi (isteğe bağlı)"
        value={birthDate}
        onChangeText={(v) => setBirthDate(formatBirthDateInput(v))}
        placeholder="GG.AA.YYYY"
        keyboardType="number-pad"
        maxLength={10}
        hint="Profil istatistikleri için; kayıt için zorunlu değil"
      />
      <OptionPicker
        label="Cinsiyet (isteğe bağlı)"
        options={GENDER_OPTIONS}
        value={gender}
        onChange={setGender}
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

      <PolicyCheckboxes
        values={policies}
        onChange={(key, value) => setPolicies((prev) => ({ ...prev, [key]: value }))}
        showErrors={showPolicyErrors}
      />

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <Button
        title="Kayıt Ol ve Kod Gönder"
        loading={loading}
        disabled={!allPoliciesAccepted(policies)}
        onPress={handleRegister}
      />

      <Pressable onPress={() => router.push('/(auth)/login')} style={styles.link}>
        <Text secondary>Zaten hesabın var mı? Giriş yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  link: { alignItems: 'center', marginTop: spacing.sm },
});
