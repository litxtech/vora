import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { HizmetChipPicker } from '@/features/vora-hizmetler/components/HizmetChipPicker';
import { HizmetProfessionPickerTrigger } from '@/features/vora-hizmetler/components/HizmetProfessionPickerTrigger';
import { HizmetProfessionSheet } from '@/features/vora-hizmetler/components/HizmetProfessionSheet';
import { HizmetFormStep, HizmetHeroBanner } from '@/features/vora-hizmetler/components/HizmetUi';
import { resolveServiceLocation } from '@/features/vora-hizmetler/services/location';
import { upsertProviderProfile } from '@/features/vora-hizmetler/services/providerData';
import type { ProviderAccountType, ServiceCategory } from '@/features/vora-hizmetler/types';
import { regionNameById } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const ACCOUNT_TYPES: { value: ProviderAccountType; label: string; icon: string }[] = [
  { value: 'individual', label: 'Bireysel Usta', icon: 'person-outline' },
  { value: 'business', label: 'İşletme Hesabı', icon: 'business-outline' },
];

function parseCategory(value: string | string[] | undefined): ServiceCategory | null {
  if (!value || Array.isArray(value)) return null;
  return value as ServiceCategory;
}

export function ProviderSetupScreen() {
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{ profession?: string; category?: string }>();
  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;

  const [displayName, setDisplayName] = useState(profile?.full_name ?? '');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState(regionNameById(regionId) ?? '');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [accountType, setAccountType] = useState<ProviderAccountType>('individual');
  const [saving, setSaving] = useState(false);
  const [professionSheetOpen, setProfessionSheetOpen] = useState(false);

  useEffect(() => {
    const initialProfession = typeof params.profession === 'string' ? params.profession : '';
    const initialCategory = parseCategory(params.category);
    if (initialProfession) setProfession(initialProfession);
    if (initialCategory) setCategories([initialCategory]);
  }, [params.profession, params.category]);

  const toggleCategory = (cat: ServiceCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat].slice(0, 5),
    );
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!displayName.trim() || !profession.trim()) {
      Alert.alert('Eksik bilgi', 'Ad ve meslek alanları zorunludur.');
      return;
    }
    if (!categories.length) {
      Alert.alert('Kategori gerekli', 'En az bir hizmet kategorisi seçin.');
      return;
    }

    const location = await resolveServiceLocation(regionId);

    setSaving(true);
    const result = await upsertProviderProfile({
      userId: user.id,
      displayName: displayName.trim(),
      profession: profession.trim(),
      bio: bio.trim() || null,
      city: city.trim() || location.city,
      regionId,
      categories,
      accountType,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    Alert.alert('Profil oluşturuldu', 'Dijital kartvizitiniz hazır. Profilinizi tamamlayabilirsiniz.', [
      { text: 'Profili Yönet', onPress: () => router.replace('/vora-hizmetler/provider-manage' as never) },
    ]);
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
        showsVerticalScrollIndicator={false}
      >
        <ScreenBackButton />

        <HizmetHeroBanner
          title="Usta Profili Oluştur"
          subtitle="Mesleğinizi seçin, dijital kartvizitinizi hazırlayın ve Keşfet'te görünün."
          icon="construct"
        />

        <HizmetFormStep step={1} title="Hesap Türü">
          <HizmetChipPicker
            options={ACCOUNT_TYPES.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
            value={accountType}
            onChange={setAccountType}
            scrollable={false}
          />
        </HizmetFormStep>

        <HizmetFormStep step={2} title="Kişisel Bilgiler">
          <Input label="Görünen Ad" value={displayName} onChangeText={setDisplayName} placeholder="Ahmet Usta" />
          <Input label="Meslek" value={profession} onChangeText={setProfession} placeholder="Elektrikçi" />
          <Input label="Şehir" value={city} onChangeText={setCity} />
          <Input
            label="Hakkında"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            placeholder="Deneyimlerinizi kısaca anlatın…"
            style={styles.textArea}
          />
        </HizmetFormStep>

        <HizmetFormStep
          step={3}
          title="Meslek & Hizmet Kategorileri"
          subtitle={`En fazla 5 kategori · ${categories.length}/5 seçili`}
        >
          <HizmetProfessionPickerTrigger
            label={profession.trim() || 'Meslek seç'}
            hint={
              categories.length > 0
                ? `${categories.length} kategori seçildi`
                : 'Tıklayın, listeden meslek seçin'
            }
            active={categories.length > 0}
            onPress={() => setProfessionSheetOpen(true)}
          />
        </HizmetFormStep>

        <Button title="Profili Kaydet" onPress={handleSubmit} loading={saving} style={styles.submit} />
      </KeyboardAwareScrollView>

      <HizmetProfessionSheet
        visible={professionSheetOpen}
        onClose={() => setProfessionSheetOpen(false)}
        title="Meslekler"
        subtitle="Mesleğinizi ve hizmet kategorilerinizi seçin"
        multiSelect
        selectedCategories={categories}
        maxSelections={5}
        onSelect={(option) => {
          setProfession(option.label);
          toggleCategory(option.category);
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: spacing.xs,
  },
});
