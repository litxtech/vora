import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { DocumentUploadPanel } from '@/components/auth/DocumentUploadPanel';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { BusinessSectorPicker } from '@/features/business-center/components/BusinessSectorPicker';
import { PolicyCheckboxes } from '@/components/auth/PolicyCheckboxes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  allPoliciesAccepted,
  INITIAL_POLICY_STATE,
  type PolicyState,
} from '@/constants/legal';
import {
  GENDER_OPTIONS,
  type BusinessCategoryId,
  type GenderId,
} from '@/constants/registration';
import { USERNAME_FORMAT_HINT, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/constants/auth';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import { DEFAULT_REGION_ID } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { resolveSignupFlow, signUpBusinessOwner } from '@/features/auth/services/registration';
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

type PickedFile = { uri: string; name: string };

export function BusinessRegisterForm() {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderId | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<BusinessCategoryId | null>(null);
  const [address, setAddress] = useState('');
  const [regionId, setRegionId] = useState<RegionId>(DEFAULT_REGION_ID);
  const [district, setDistrict] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
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

    if (!businessName.trim()) { setError('İşletme adı gereklidir.'); return; }
    if (!category) { setError('İşletme kategorisi seçin.'); return; }
    if (!address.trim()) { setError('İşletme adresi gereklidir.'); return; }
    if (!district) { setError('İlçe seçimi gereklidir.'); return; }
    if (!phone.trim()) { setError('İşletme telefonu gereklidir.'); return; }
    if (files.length === 0) { setError('En az bir işletme belgesi yükleyin.'); return; }

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

    const signupResult = await signUpBusinessOwner(
      {
        firstName,
        lastName,
        username,
        birthDate: parsedBirth ? toISODate(parsedBirth) : null,
        gender: gender ?? null,
        email,
        password,
      },
      {
        businessName,
        category,
        address,
        district,
        phone,
        taxNumber,
        description,
        website,
        regionId,
      },
      files.map((f) => f.uri),
    );

    const flow = await resolveSignupFlow(email, signupResult);
    setLoading(false);

    if (!flow.success) {
      setError(flow.error);
      return;
    }

    if (flow.redirectToVerify) {
      router.replace(
        `/(auth)/verify-email?email=${encodeURIComponent(email.trim())}&accountType=business` as Href,
      );
    }
  };

  return (
    <View style={styles.form}>
      <Text variant="label">Yetkili Bilgileri</Text>
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
        placeholder="isletme@email.com"
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

      <Text variant="label" style={styles.section}>İşletme Bilgileri</Text>
      <Input label="İşletme Adı" value={businessName} onChangeText={setBusinessName} placeholder="İşletme adı" />
      <BusinessSectorPicker
        label="Sektör"
        hint="Tüm sektörler — arama ile filtreleyebilirsiniz"
        value={category}
        onChange={setCategory}
      />
      <Input label="Adres" value={address} onChangeText={setAddress} placeholder="Tam adres" multiline />
      <RegionDistrictPicker
        regionId={regionId}
        district={district}
        onRegionChange={(id) => {
          setRegionId(id);
          setDistrict(null);
        }}
        onDistrictChange={setDistrict}
      />
      <Input
        label="Telefon"
        value={phone}
        onChangeText={setPhone}
        placeholder="05XX XXX XX XX"
        keyboardType="phone-pad"
      />
      <Input
        label="Vergi No (opsiyonel)"
        value={taxNumber}
        onChangeText={setTaxNumber}
        placeholder="Vergi numarası"
        keyboardType="number-pad"
      />
      <Input
        label="Açıklama (opsiyonel)"
        value={description}
        onChangeText={setDescription}
        placeholder="İşletme hakkında kısa bilgi"
        multiline
      />
      <Input
        label="Web Sitesi (opsiyonel)"
        value={website}
        onChangeText={setWebsite}
        placeholder="https://"
        autoCapitalize="none"
      />

      <DocumentUploadPanel files={files} onChange={setFiles} />

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
  section: { marginTop: spacing.sm },
  link: { alignItems: 'center', marginTop: spacing.sm },
});
