import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  INTEREST_OPTIONS,
  USERNAME_FORMAT_HINT,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/constants/auth';
import { GENDER_OPTIONS, type GenderId } from '@/constants/registration';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { uploadAvatar } from '@/features/auth/services/avatarUpload';
import { uploadCover } from '@/features/profile/services/coverUpload';
import {
  formatBirthDateInput,
  formatIbanInput,
  isoToDisplayBirthDate,
  normalizeIban,
  normalizeUsernameInput,
  parseBirthDate,
  toISODate,
  validateBirthDate,
  validateTurkishIban,
  validateTurkishName,
  validateUsername,
} from '@/features/auth/services/validation';
import { isUsernameAvailable, mapUsernameDatabaseError } from '@/features/auth/services/username';
import { EditProfileHero } from '@/features/profile/components/EditProfileHero';
import { EditProfileSection } from '@/features/profile/components/EditProfileSection';
import {
  EditBusinessProfileSection,
  EditBusinessLegalNotice,
  useBusinessBrandingDraft,
  saveBusinessBrandingDraft,
} from '@/features/profile/components/EditBusinessProfileSection';
import { EmailChangePanel } from '@/features/profile/components/EmailChangePanel';
import { ProfileLinksEditor } from '@/features/profile/components/ProfileLinksEditor';
import { fetchOwnProfileContactFields } from '@/features/profile/services/profileContactFields';
import { updateProfile } from '@/features/profile/services/profileData';
import {
  fetchProfileLinks,
  profileLinksToDrafts,
  saveProfileLinks,
} from '@/features/profile/services/profileLinks';
import { invalidateProfileSessionCache } from '@/features/profile/services/profileSessionCache';
import { invalidateBusinessDetailCache } from '@/features/businesses/services/businessDetailCache';
import { pickCoverImage, pickLogoImage } from '@/features/profile/services/profileImagePicker';
import type { ProfileVisibility } from '@/features/profile/types';
import type { ProfileLinkDraft } from '@/features/profile/constants/profileLinks';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: 'public', label: 'Herkese Açık' },
  { value: 'members', label: 'Sadece Üyeler' },
  { value: 'friends', label: 'Sadece Arkadaşlar' },
];

const INTEREST_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  news: 'newspaper-outline',
  traffic: 'car-outline',
  jobs: 'briefcase-outline',
  events: 'calendar-outline',
  businesses: 'storefront-outline',
  sports: 'football-outline',
  tourism: 'airplane-outline',
  lost_found: 'search-outline',
};

export function EditProfileScreen() {
  const { user, profile, isGuest, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderId | null>(null);
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [regionId, setRegionId] = useState<RegionId | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');
  const [showProfileViews, setShowProfileViews] = useState(true);
  const [showLikedPosts, setShowLikedPosts] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<ProfileLinkDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const isBusinessAccount = profile?.account_type === 'business';
  const {
    draft: businessDraft,
    setDraft: setBusinessDraft,
    record: businessRecord,
    loading: businessBrandingLoading,
  } = useBusinessBrandingDraft(isBusinessAccount ? user?.id : undefined);

  const isBusinessMode =
    isBusinessAccount &&
    !!businessDraft &&
    businessRecord?.registrationStatus === 'approved';

  const usesBusinessBranding = isBusinessAccount && !!businessDraft && !!businessRecord;

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setUsername(profile.username ?? '');
    setBirthDate(isoToDisplayBirthDate(profile.birth_date));
    setGender(profile.gender ?? null);
    setBio(profile.bio ?? '');
    setOccupation(profile.occupation ?? '');
    setRegionId((profile.region_id as RegionId) ?? null);
    setDistrict(profile.district ?? null);
    setInterests(profile.interests ?? []);
    setVisibility(profile.profile_visibility ?? 'public');
    setShowProfileViews(profile.show_profile_views ?? true);
    setShowLikedPosts(profile.show_liked_posts ?? false);
    setAvatarUri(profile.avatar_url ?? null);
    setCoverUri(profile.cover_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    void fetchOwnProfileContactFields().then((fields) => {
      if (!fields) return;
      setAddress(fields.address ?? '');
      setIban(fields.iban ? formatIbanInput(fields.iban) : '');
      setBankName(fields.bank_name ?? '');
      setBankAccountName(fields.bank_account_name ?? '');
    });

    void fetchProfileLinks(user.id).then((links) => {
      setLinkDrafts(profileLinksToDrafts(links));
    });
  }, [user?.id]);

  const pickAvatar = async () => {
    const uri = await pickLogoImage();
    if (!uri) return;
    if (usesBusinessBranding) {
      setBusinessDraft((prev) => (prev ? { ...prev, logoUri: uri } : prev));
    } else {
      setAvatarUri(uri);
    }
  };

  const pickCover = async () => {
    const uri = await pickCoverImage();
    if (!uri) return;
    if (usesBusinessBranding) {
      setBusinessDraft((prev) => (prev ? { ...prev, coverUri: uri } : prev));
    } else {
      setCoverUri(uri);
    }
  };

  const activeAvatarUri =
    usesBusinessBranding && businessDraft ? businessDraft.logoUri : avatarUri;
  const activeCoverUri =
    usesBusinessBranding && businessDraft ? businessDraft.coverUri : coverUri;

  const confirmRemoveAvatar = () => {
    Alert.alert(
      usesBusinessBranding ? 'İşletme logosunu kaldır' : 'Profil fotoğrafını kaldır',
      usesBusinessBranding ? 'Logo kaldırılacak.' : 'Profil fotoğrafınız silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            if (usesBusinessBranding) {
              setBusinessDraft((prev) => (prev ? { ...prev, logoUri: null } : prev));
            } else {
              setAvatarUri(null);
            }
          },
        },
      ],
    );
  };

  const confirmRemoveCover = () => {
    Alert.alert(
      usesBusinessBranding ? 'Kapak görselini kaldır' : 'Kapak fotoğrafını kaldır',
      usesBusinessBranding ? 'Kapak görseli kaldırılacak.' : 'Kapak fotoğrafınız silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            if (usesBusinessBranding) {
              setBusinessDraft((prev) => (prev ? { ...prev, coverUri: null } : prev));
            } else {
              setCoverUri(null);
            }
          },
        },
      ],
    );
  };

  const showAvatarPhotoMenu = () => {
    const options = ['Galeriden seç (kırp)', ...(activeAvatarUri ? ['Kaldır'] : []), 'İptal'];
    const removeIndex = activeAvatarUri ? 1 : -1;
    const cancelIndex = options.length - 1;

    const run = (index: number) => {
      if (index === 0) void pickAvatar();
      else if (index === removeIndex) confirmRemoveAvatar();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: removeIndex >= 0 ? removeIndex : undefined,
        },
        run,
      );
      return;
    }

    Alert.alert(usesBusinessBranding ? 'İşletme logosu' : 'Profil fotoğrafı', undefined, [
      { text: 'Galeriden seç (kırp)', onPress: () => void pickAvatar() },
      ...(activeAvatarUri
        ? [{ text: 'Kaldır', style: 'destructive' as const, onPress: confirmRemoveAvatar }]
        : []),
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    const shouldValidateNames = !isGuest || firstName.trim().length > 0 || lastName.trim().length > 0;
    if (shouldValidateNames) {
      const firstNameError = validateTurkishName(firstName, 'Ad');
      if (firstNameError) {
        Alert.alert('Eksik bilgi', firstNameError);
        return;
      }
      const lastNameError = validateTurkishName(lastName, 'Soyad');
      if (lastNameError) {
        Alert.alert('Eksik bilgi', lastNameError);
        return;
      }
    }
    if (!isGuest) {
      if (!gender) {
        Alert.alert('Eksik bilgi', 'Lütfen cinsiyet seçin.');
        return;
      }
      if (!isBusinessMode) {
        if (!regionId) {
          Alert.alert('Eksik bilgi', 'Lütfen bir şehir seçin.');
          return;
        }
        if (!district) {
          Alert.alert('Eksik bilgi', 'Lütfen bir ilçe seçin.');
          return;
        }
      }
    }
    if (birthDate.trim()) {
      const birthError = validateBirthDate(birthDate);
      if (birthError) {
        Alert.alert('Eksik bilgi', birthError);
        return;
      }
    }
    const ibanError = validateTurkishIban(iban);
    if (ibanError) {
      Alert.alert('Geçersiz IBAN', ibanError);
      return;
    }

    const normalizedUsername = normalizeUsernameInput(username);
    const usernameChanged = normalizedUsername !== profile.username;

    if (usernameChanged) {
      const usernameError = validateUsername(normalizedUsername);
      if (usernameError) {
        Alert.alert('Geçersiz kullanıcı adı', usernameError);
        return;
      }

      const available = await isUsernameAvailable(normalizedUsername, user.id);
      if (!available) {
        Alert.alert('Kullanıcı adı alındı', 'Bu kullanıcı adı zaten kullanılıyor.');
        return;
      }
    }

    setSaving(true);

    if (usesBusinessBranding && businessDraft) {
      const brandingResult = await saveBusinessBrandingDraft(user.id, businessDraft, businessRecord);
      if (brandingResult.error) {
        setSaving(false);
        Alert.alert('Hata', brandingResult.error);
        return;
      }
      invalidateBusinessDetailCache();
    }

    let avatarUrl: string | null = profile.avatar_url;
    if (!usesBusinessBranding && avatarUri !== profile.avatar_url) {
      if (!avatarUri) {
        avatarUrl = null;
      } else if (!avatarUri.startsWith('http')) {
        const { url, error: uploadError } = await uploadAvatar(user.id, avatarUri);
        if (uploadError) {
          setSaving(false);
          Alert.alert('Hata', 'Profil fotoğrafı yüklenemedi.');
          return;
        }
        avatarUrl = url;
      } else {
        avatarUrl = avatarUri;
      }
    }

    let coverUrl: string | null = profile.cover_url;
    if (!usesBusinessBranding && coverUri !== profile.cover_url) {
      if (!coverUri) {
        coverUrl = null;
      } else if (!coverUri.startsWith('http')) {
        const { url, error: uploadError } = await uploadCover(user.id, coverUri);
        if (uploadError) {
          setSaving(false);
          Alert.alert('Hata', 'Kapak fotoğrafı yüklenemedi.');
          return;
        }
        coverUrl = url;
      } else {
        coverUrl = coverUri;
      }
    }

    const parsedBirth = birthDate.trim() ? parseBirthDate(birthDate) : null;

    const { error } = await updateProfile(user.id, {
      ...(usernameChanged ? { username: normalizedUsername } : {}),
      firstName,
      lastName,
      bio: isBusinessMode ? undefined : bio.trim() || undefined,
      occupation: occupation.trim() || undefined,
      regionId: isBusinessMode ? undefined : regionId,
      district: isBusinessMode ? undefined : district,
      address: address.trim() || undefined,
      iban: iban.trim() ? normalizeIban(iban) : null,
      bankName: bankName.trim() || null,
      bankAccountName: bankAccountName.trim() || null,
      gender,
      birthDate: parsedBirth ? toISODate(parsedBirth) : null,
      interests,
      ...(!usesBusinessBranding ? { avatarUrl, coverUrl } : {}),
      profileVisibility: visibility,
      showProfileViews,
      showLikedPosts,
    });

    if (error) {
      setSaving(false);
      Alert.alert('Hata', mapUsernameDatabaseError(error) ?? error);
      return;
    }

    const { error: linksError } = await saveProfileLinks(user.id, linkDrafts);
    setSaving(false);

    if (linksError) {
      Alert.alert('Hata', linksError);
      return;
    }

    await refreshProfile?.();
    invalidateProfileSessionCache(user.id);
    Alert.alert('Kaydedildi', 'Profiliniz güncellendi.', [
      { text: 'Tamam', onPress: () => router.replace('/(tabs)/profile' as Href) },
    ]);
  };

  if (!user || !profile) return null;

  const heroDisplayName = isBusinessMode && businessDraft
    ? businessDraft.businessName
    : firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : username || profile.username;

  const heroAvatarUri = usesBusinessBranding && businessDraft ? businessDraft.logoUri : avatarUri;
  const heroCoverUri = usesBusinessBranding && businessDraft ? businessDraft.coverUri : coverUri;

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            title={isBusinessAccount ? 'Kurumsal Profil' : 'Profili Düzenle'}
            subtitle={
              isBusinessAccount
                ? 'İşletme kimliği, logo ve yetkili bilgileri'
                : 'Fotoğraf, biyografi ve görünürlük ayarları'
            }
            trailing={
              <Button
                title={saving ? 'Kaydediliyor...' : 'Kaydet'}
                onPress={handleSave}
                disabled={saving}
                loading={saving}
                size="compact"
                fullWidth={false}
              />
            }
          />

          {!businessBrandingLoading ? (
            <EditProfileHero
              displayName={heroDisplayName}
              username={username}
              avatarUri={heroAvatarUri}
              coverUri={heroCoverUri}
              isPremium={profile.is_premium}
              isVerified={profile.is_verified}
              isBusinessVerified={businessRecord?.registrationStatus === 'approved'}
              isBusinessMode={usesBusinessBranding}
              profileUsername={profile.username}
              onPickCover={pickCover}
              onRemoveCover={confirmRemoveCover}
              onAvatarMenu={showAvatarPhotoMenu}
              onRemoveAvatar={confirmRemoveAvatar}
            />
          ) : null}

          {isBusinessAccount && !businessBrandingLoading ? (
            <EditBusinessProfileSection
              draft={businessDraft}
              setDraft={setBusinessDraft}
              record={businessRecord}
              loading={businessBrandingLoading}
              onPickLogo={pickAvatar}
              onPickCover={pickCover}
            />
          ) : null}

          {isBusinessAccount ? <EditBusinessLegalNotice /> : null}

          <EditProfileSection
            icon="person-outline"
            title={isBusinessAccount ? 'Yetkili kişi (evrak)' : 'Kişisel Bilgiler'}
          >
            {isBusinessAccount ? (
              <Text secondary variant="caption" style={styles.hint}>
                Bu ad-soyad bilgileri kullanıcılara gösterilmez; sözleşme ve resmi evraklar içindir.
              </Text>
            ) : null}
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label={isBusinessAccount ? 'Yetkili adı' : 'Ad'}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={isBusinessAccount ? 'Yetkili adı' : 'Adınız'}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.half}>
                <Input
                  label={isBusinessAccount ? 'Yetkili soyadı' : 'Soyad'}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={isBusinessAccount ? 'Yetkili soyadı' : 'Soyadınız'}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <Input
              label="Kullanıcı Adı"
              value={username}
              onChangeText={(v) => setUsername(normalizeUsernameInput(v))}
              placeholder="kullanici_adi"
              autoCapitalize="none"
              hint={`${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} karakter, ${USERNAME_FORMAT_HINT}. Dilediğiniz zaman değiştirebilirsiniz.`}
            />
            <Input
              label="Doğum Tarihi"
              value={birthDate}
              onChangeText={(v) => setBirthDate(formatBirthDateInput(v))}
              placeholder="GG.AA.YYYY"
              keyboardType="number-pad"
              maxLength={10}
              hint="Türkiye formatı: gün.ay.yıl"
            />
            <OptionPicker label="Cinsiyet" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
          </EditProfileSection>

          <EditProfileSection icon="mail-outline" title="İletişim">
            <EmailChangePanel
              currentEmail={user.email ?? ''}
              isGuest={isGuest}
              onEmailChanged={async () => {
                await refreshProfile?.();
                Alert.alert(
                  'Başarılı',
                  isGuest
                    ? 'E-posta adresiniz güncellendi. Hesabınız artık bireysel hesap olarak çalışıyor.'
                    : 'E-posta adresiniz güncellendi.',
                );
              }}
            />
            <Input
              label="Adres"
              value={address}
              onChangeText={setAddress}
              placeholder="Mahalle, sokak, bina no..."
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
            <Input
              label="IBAN"
              value={iban}
              onChangeText={(v) => setIban(formatIbanInput(v))}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              autoCapitalize="characters"
              hint="Ödeme almak için TR IBAN (isteğe bağlı)"
            />
            <Input
              label="Banka Adı"
              value={bankName}
              onChangeText={setBankName}
              placeholder="Örn: Ziraat Bankası"
              maxLength={120}
              hint="IBAN ile birlikte doldurulması önerilir"
            />
            <Input
              label="Hesap Sahibi"
              value={bankAccountName}
              onChangeText={setBankAccountName}
              placeholder="Ad Soyad veya şirket ünvanı"
              maxLength={160}
              autoCapitalize="words"
              hint="Kişi veya şirket adı"
            />
          </EditProfileSection>

          {!isBusinessMode ? (
            <EditProfileSection icon="location-outline" title="Konum">
              <RegionDistrictPicker
                regionId={regionId}
                district={district}
                onRegionChange={(id) => {
                  setRegionId(id);
                  setDistrict(null);
                }}
                onDistrictChange={setDistrict}
              />
            </EditProfileSection>
          ) : null}

          {!isBusinessMode ? (
            <EditProfileSection icon="document-text-outline" title="Hakkında">
              <View>
                <Input
                  label="Biyografi"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Kendinizi tanıtın..."
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                  style={styles.textArea}
                />
                <Text
                  secondary
                  variant="caption"
                  style={[styles.charCount, { color: bio.length >= 280 ? colors.warning : colors.textMuted }]}
                >
                  {bio.length}/300
                </Text>
              </View>
              <Input
                label="Meslek / İlgi Alanı"
                value={occupation}
                onChangeText={setOccupation}
                placeholder="Örn: Turizm çalışanı, Öğrenci..."
                maxLength={80}
              />
            </EditProfileSection>
          ) : null}

          <EditProfileSection icon="link-outline" title="Sosyal Medya & Bağlantılar">
            <ProfileLinksEditor drafts={linkDrafts} onChange={setLinkDrafts} />
          </EditProfileSection>

          <EditProfileSection icon="heart-outline" title="İlgi Alanları">
            <View style={styles.chipGrid}>
              {INTEREST_OPTIONS.map((option) => {
                const selected = interests.includes(option.id);
                const icon = INTEREST_ICONS[option.id] ?? 'ellipse-outline';
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggleInterest(option.id)}
                    style={({ pressed }) => [
                      styles.interestChip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? `${colors.primary}16` : colors.surfaceElevated,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={14}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                    <Text variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </EditProfileSection>

          <EditProfileSection icon="shield-outline" title="Gizlilik">
            <View style={styles.options}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setVisibility(opt.value)}
                  style={[
                    styles.option,
                    {
                      borderColor: visibility === opt.value ? colors.primary : colors.border,
                      backgroundColor: visibility === opt.value ? `${colors.primary}12` : 'transparent',
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: visibility === opt.value ? colors.primary : colors.text }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchMeta}>
                <Text variant="label">Profil Görüntülemeleri</Text>
                <Text secondary variant="caption">
                  Görüntülenme sayısını göster
                </Text>
              </View>
              <Switch value={showProfileViews} onValueChange={setShowProfileViews} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchMeta}>
                <Text variant="label">Beğenilenler</Text>
                <Text secondary variant="caption">
                  Beğenilen gönderileri herkese göster
                </Text>
              </View>
              <Switch value={showLikedPosts} onValueChange={setShowLikedPosts} trackColor={{ true: colors.primary }} />
            </View>
          </EditProfileSection>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  hint: { marginBottom: spacing.xs },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', marginTop: -spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchMeta: { flex: 1, gap: 2 },
});
