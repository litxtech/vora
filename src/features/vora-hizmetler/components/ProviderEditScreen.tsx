import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { HizmetChipPicker } from '@/features/vora-hizmetler/components/HizmetChipPicker';
import { HizmetProfessionPickerTrigger } from '@/features/vora-hizmetler/components/HizmetProfessionPickerTrigger';
import { HizmetProfessionSheet } from '@/features/vora-hizmetler/components/HizmetProfessionSheet';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { uploadHizmetlerMedia } from '@/features/vora-hizmetler/services/mediaUpload';
import { resolveServiceLocation } from '@/features/vora-hizmetler/services/location';
import { upsertProviderProfile } from '@/features/vora-hizmetler/services/providerData';
import type { ProviderAccountType, ServiceCategory } from '@/features/vora-hizmetler/types';
import { regionNameById } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { pickCoverImage, pickLogoImage } from '@/features/profile/services/profileImagePicker';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const ACCOUNT_TYPES: { value: ProviderAccountType; label: string; icon: string }[] = [
  { value: 'individual', label: 'Bireysel Usta', icon: 'person-outline' },
  { value: 'business', label: 'İşletme Hesabı', icon: 'business-outline' },
];

export function ProviderEditScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const { provider, loading, reloadProfile } = useMyProviderProfile(user?.id ?? null);

  const [displayName, setDisplayName] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [accountType, setAccountType] = useState<ProviderAccountType>('individual');
  const [isActive, setIsActive] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [coverChanged, setCoverChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [professionSheetOpen, setProfessionSheetOpen] = useState(false);

  useEffect(() => {
    if (!provider) return;
    setDisplayName(provider.displayName);
    setProfession(provider.profession);
    setBio(provider.bio ?? '');
    setCity(provider.city ?? regionNameById(regionId) ?? '');
    setCategories(provider.categories);
    setAccountType(provider.accountType);
    setIsActive(provider.isActive);
    setAvatarUri(provider.avatarUrl);
    setCoverUri(provider.coverUrl);
  }, [provider, regionId]);

  const toggleCategory = (cat: ServiceCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat].slice(0, 5),
    );
  };

  const pickAvatar = async () => {
    const uri = await pickLogoImage();
    if (uri) {
      setAvatarUri(uri);
      setAvatarChanged(true);
    }
  };

  const pickCover = async () => {
    const uri = await pickCoverImage();
    if (uri) {
      setCoverUri(uri);
      setCoverChanged(true);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !provider) return;
    if (!displayName.trim() || !profession.trim()) {
      Alert.alert('Eksik bilgi', 'Ad ve meslek alanları zorunludur.');
      return;
    }
    if (!categories.length) {
      Alert.alert('Kategori gerekli', 'En az bir hizmet kategorisi seçin.');
      return;
    }

    setSaving(true);

    let avatarUrl = provider.avatarUrl;
    let coverUrl = provider.coverUrl;

    if (avatarChanged && avatarUri && !avatarUri.startsWith('http')) {
      const upload = await uploadHizmetlerMedia(user.id, avatarUri, 'avatar');
      if (upload.error) {
        setSaving(false);
        Alert.alert('Hata', upload.error);
        return;
      }
      avatarUrl = upload.url;
    }

    if (coverChanged && coverUri && !coverUri.startsWith('http')) {
      const upload = await uploadHizmetlerMedia(user.id, coverUri, 'cover');
      if (upload.error) {
        setSaving(false);
        Alert.alert('Hata', upload.error);
        return;
      }
      coverUrl = upload.url;
    }

    const location = await resolveServiceLocation(regionId);

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
      avatarUrl,
      coverUrl,
      isActive,
    });

    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    await reloadProfile();
    Alert.alert('Kaydedildi', 'Profiliniz güncellendi.', [{ text: 'Tamam', onPress: () => router.back() }]);
  };

  if (loading || !provider) {
    return (
      <GradientBackground>
        <ScreenBackButton />
        <Text variant="body" style={{ padding: spacing.lg }}>
          {loading ? 'Profil yükleniyor…' : 'Profil bulunamadı.'}
        </Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
        showsVerticalScrollIndicator={false}
      >
        <ScreenBackButton />
        <Text variant="h2">Profili Düzenle</Text>
        <Text secondary variant="body">
          Dijital kartvizitinizi güncelleyin. Müşteriler bu bilgileri görür.
        </Text>

        <GlassCard style={styles.mediaCard}>
          <Pressable onPress={pickCover} style={styles.coverPicker}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: `${VORA_HIZMETLER_ACCENT}18` }]}>
                <Ionicons name="image-outline" size={28} color={VORA_HIZMETLER_ACCENT} />
                <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT }}>
                  Kapak fotoğrafı ekle
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={pickAvatar} style={[styles.avatarPicker, { borderColor: colors.background }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${VORA_HIZMETLER_ACCENT}20` }]}>
                <Ionicons name="camera-outline" size={22} color={VORA_HIZMETLER_ACCENT} />
              </View>
            )}
          </Pressable>
        </GlassCard>

        <GlassCard style={styles.form}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text variant="label">Profil Aktif</Text>
              <Text secondary variant="caption">
                Kapalıyken teklif alamaz ve acil çağrılarda görünmezsiniz.
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: VORA_HIZMETLER_ACCENT }}
            />
          </View>
          <Input label="Görünen Ad" value={displayName} onChangeText={setDisplayName} />
          <Input label="Meslek" value={profession} onChangeText={setProfession} />
          <Input label="Şehir" value={city} onChangeText={setCity} />
          <Input
            label="Hakkında"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </GlassCard>

        <GlassCard style={styles.form}>
          <Text variant="label">Hesap Türü</Text>
          <HizmetChipPicker
            options={ACCOUNT_TYPES.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
            value={accountType}
            onChange={setAccountType}
            scrollable={false}
          />
        </GlassCard>

        <GlassCard style={styles.form}>
          <Text variant="label">Hizmet Kategorileri ({categories.length}/5)</Text>
          <HizmetProfessionPickerTrigger
            label={profession.trim() || 'Meslek seç'}
            hint={categories.length > 0 ? `${categories.length} kategori seçildi` : 'Kategori ekle'}
            active={categories.length > 0}
            onPress={() => setProfessionSheetOpen(true)}
          />
        </GlassCard>

        <Button title="Değişiklikleri Kaydet" onPress={handleSubmit} loading={saving} />
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
  mediaCard: {
    padding: 0,
    overflow: 'hidden',
  },
  coverPicker: {
    height: 140,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  avatarPicker: {
    position: 'absolute',
    left: spacing.lg,
    bottom: -28,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
