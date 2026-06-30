import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentUploadPanel } from '@/components/auth/DocumentUploadPanel';
import { BusinessSectorPicker } from '@/features/business-center/components/BusinessSectorPicker';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import type { BusinessCategoryId } from '@/constants/registration';
import { spacing } from '@/constants/theme';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import {
  fetchOwnBusinessApplicationStatus,
  submitBusinessApplication,
} from '@/features/account-switch/services/businessApplication';
import { BUSINESS_ROUTES } from '@/features/business-center/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type PickedFile = { uri: string; name: string };

export function BusinessApplicationScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { refreshSwitchState } = useAccountSwitch();

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
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchOwnBusinessApplicationStatus(user.id).then((biz) => {
      setChecking(false);
      if (!biz) return;
      if (biz.registrationStatus === 'approved') {
        router.replace(BUSINESS_ROUTES.account as Href);
        return;
      }
      router.replace(BUSINESS_ROUTES.pending as Href);
    });
  }, [user?.id]);

  const handleSubmit = async () => {
    setError(null);
    if (!user?.id) {
      setError('Oturum bulunamadı.');
      return;
    }
    if (profile?.account_type === 'business') {
      setError('Zaten işletme hesabınız var.');
      return;
    }
    if (!businessName.trim()) {
      setError('İşletme adı gereklidir.');
      return;
    }
    if (!category) {
      setError('İşletme kategorisi seçin.');
      return;
    }
    if (!address.trim()) {
      setError('İşletme adresi gereklidir.');
      return;
    }
    if (!district) {
      setError('İlçe seçimi gereklidir.');
      return;
    }
    if (!phone.trim()) {
      setError('İşletme telefonu gereklidir.');
      return;
    }
    if (files.length === 0) {
      setError('En az bir işletme belgesi yükleyin.');
      return;
    }

    setLoading(true);
    const result = await submitBusinessApplication(user.id, {
      businessName,
      category,
      address,
      district,
      phone,
      taxNumber,
      description,
      website,
      regionId,
      documentUris: files.map((f) => f.uri),
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshSwitchState();
    Alert.alert(
      'Başvuru alındı',
      'İşletme belgeleriniz inceleniyor. Onay sonrası profil sekmesine iki kez dokunarak işletme hesabınıza geçebilirsiniz.',
      [{ text: 'Tamam', onPress: () => router.replace(BUSINESS_ROUTES.pending as Href) }],
    );
  };

  if (checking) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text secondary>Kontrol ediliyor…</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title="İşletme Başvurusu"
          subtitle="Bireysel hesabınıza bağlı işletme profili oluşturun"
          showBack
        />

        <Text secondary variant="caption">
          Başvuru mevcut hesabınıza bağlanır; ayrı e-posta ile kayıt gerekmez. Onay sonrası profil
          sekmesine iki kez dokunarak bireysel ve işletme görünümü arasında geçiş yapabilirsiniz.
        </Text>

        <Input label="İşletme Adı" value={businessName} onChangeText={setBusinessName} placeholder="İşletme adı" />
        <BusinessSectorPicker
          label="Sektör"
          hint="Restoran, sağlık, hizmet ve diğer tüm sektörler"
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

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button title="Başvuruyu Gönder" loading={loading} onPress={handleSubmit} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
