import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { INTEREST_OPTIONS } from '@/constants/auth';
import { GENDER_OPTIONS, type GenderId } from '@/constants/registration';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { uploadAvatar } from '@/features/auth/services/avatarUpload';
import { isUsernameAvailable, mapUsernameDatabaseError } from '@/features/auth/services/username';
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
  validateUsername,
} from '@/features/auth/services/validation';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminUpdateUserProfile,
  fetchAdminUser,
} from '@/features/admin/services/userManagement';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { uploadCover } from '@/features/profile/services/coverUpload';
import type { ProfileVisibility } from '@/features/profile/types';
import { useTheme } from '@/providers/ThemeProvider';

const VISIBILITY_OPTIONS: { id: ProfileVisibility; label: string }[] = [
  { id: 'public', label: 'Herkese Açık' },
  { id: 'members', label: 'Sadece Üyeler' },
  { id: 'friends', label: 'Sadece Arkadaşlar' },
];

export function AdminUserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderId | null>(null);
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
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [originalCoverUrl, setOriginalCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void fetchAdminUser(id).then(({ data, error }) => {
      if (error || !data) {
        Alert.alert('Hata', error ?? 'Kullanıcı bulunamadı.');
        router.back();
        return;
      }

      setUsername(String(data.username ?? ''));
      setOriginalUsername(String(data.username ?? ''));
      setFirstName(String(data.first_name ?? ''));
      setLastName(String(data.last_name ?? ''));
      setBio(String(data.bio ?? ''));
      setOccupation(String(data.occupation ?? ''));
      setBirthDate(isoToDisplayBirthDate(data.birth_date as string | null));
      setGender((data.gender as GenderId) ?? null);
      setAddress(String(data.address ?? ''));
      setIban(data.iban ? formatIbanInput(String(data.iban)) : '');
      setBankName(String(data.bank_name ?? ''));
      setBankAccountName(String(data.bank_account_name ?? ''));
      setRegionId((data.region_id as RegionId) ?? null);
      setDistrict((data.district as string) ?? null);
      setInterests(Array.isArray(data.interests) ? (data.interests as string[]) : []);
      setVisibility((data.profile_visibility as ProfileVisibility) ?? 'public');
      setShowProfileViews(Boolean(data.show_profile_views ?? true));
      setShowLikedPosts(Boolean(data.show_liked_posts ?? false));
      setAvatarUri((data.avatar_url as string | null) ?? null);
      setOriginalAvatarUrl((data.avatar_url as string | null) ?? null);
      setCoverUri((data.cover_url as string | null) ?? null);
      setOriginalCoverUrl((data.cover_url as string | null) ?? null);
      setLoading(false);
    });
  }, [id]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const toggleInterest = (interestId: string) => {
    setInterests((prev) =>
      prev.includes(interestId) ? prev.filter((item) => item !== interestId) : [...prev, interestId],
    );
  };

  const handleSave = async () => {
    if (!id) return;

    const normalizedUsername = normalizeUsernameInput(username);
    const usernameChanged = normalizedUsername !== originalUsername;

    if (usernameChanged) {
      const usernameError = validateUsername(normalizedUsername);
      if (usernameError) {
        Alert.alert('Geçersiz kullanıcı adı', usernameError);
        return;
      }
      const available = await isUsernameAvailable(normalizedUsername, id);
      if (!available) {
        Alert.alert('Kullanıcı adı alındı', 'Bu kullanıcı adı zaten kullanılıyor.');
        return;
      }
    }

    if (birthDate.trim()) {
      const birthError = validateBirthDate(birthDate);
      if (birthError) {
        Alert.alert('Geçersiz doğum tarihi', birthError);
        return;
      }
    }

    const ibanError = validateTurkishIban(iban);
    if (ibanError) {
      Alert.alert('Geçersiz IBAN', ibanError);
      return;
    }

    setSaving(true);

    let avatarUrl: string | null = originalAvatarUrl;
    if (avatarUri !== originalAvatarUrl) {
      if (!avatarUri) {
        avatarUrl = null;
      } else if (!avatarUri.startsWith('http')) {
        const { url, error: uploadError } = await uploadAvatar(id, avatarUri);
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

    let coverUrl: string | null = originalCoverUrl;
    if (coverUri !== originalCoverUrl) {
      if (!coverUri) {
        coverUrl = null;
      } else if (!coverUri.startsWith('http')) {
        const { url, error: uploadError } = await uploadCover(id, coverUri);
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

    const { error } = await adminUpdateUserProfile(id, {
      ...(usernameChanged ? { username: normalizedUsername } : {}),
      firstName,
      lastName,
      bio: bio.trim() || undefined,
      occupation: occupation.trim() || undefined,
      regionId: regionId ?? undefined,
      district: district ?? undefined,
      address: address.trim() || undefined,
      iban: iban.trim() ? normalizeIban(iban) : null,
      bankName: bankName.trim() || null,
      bankAccountName: bankAccountName.trim() || null,
      gender: gender ?? undefined,
      birthDate: parsedBirth ? toISODate(parsedBirth) : null,
      interests,
      avatarUrl,
      coverUrl,
      profileVisibility: visibility,
      showProfileViews,
      showLikedPosts,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Hata', mapUsernameDatabaseError(error) ?? error);
      return;
    }

    Alert.alert('Kaydedildi', 'Kullanıcı profili güncellendi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <AdminShell title="Profil düzenle" requireAdmin>
        <AdminEmptyState loading />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Profil düzenle"
      subtitle={username ? `@${username}` : undefined}
      requireAdmin
    >
      <GlassCard style={styles.card}>
        <Text variant="label">Profil fotoğrafı</Text>
        <View style={styles.avatarRow}>
          <ProfileAvatar username={username} avatarUrl={avatarUri} size={72} />
          <View style={styles.avatarActions}>
            <Pressable onPress={() => void pickAvatar()} style={styles.linkBtn}>
              <Ionicons name="image-outline" size={16} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary }}>
                Galeriden seç
              </Text>
            </Pressable>
            {avatarUri ? (
              <Pressable onPress={() => setAvatarUri(null)} style={styles.linkBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text variant="caption" style={{ color: colors.danger }}>
                  Kaldır
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text variant="label">Kapak fotoğrafı</Text>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverPreview} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: `${colors.primary}22` }]}>
            <Text secondary variant="caption">
              Kapak yok
            </Text>
          </View>
        )}
        <View style={styles.avatarActions}>
          <Pressable onPress={() => void pickCover()} style={styles.linkBtn}>
            <Ionicons name="image-outline" size={16} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary }}>
              Galeriden seç
            </Text>
          </Pressable>
          {coverUri ? (
            <Pressable onPress={() => setCoverUri(null)} style={styles.linkBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text variant="caption" style={{ color: colors.danger }}>
                Kaldır
              </Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>

      <AdminSectionHeader title="Kimlik" />
      <GlassCard style={styles.card}>
        <AdminFormField label="Kullanıcı adı" value={username} onChangeText={(v) => setUsername(normalizeUsernameInput(v))} />
        <AdminFormField label="Ad" value={firstName} onChangeText={setFirstName} />
        <AdminFormField label="Soyad" value={lastName} onChangeText={setLastName} />
        <AdminFormField
          label="Doğum tarihi"
          placeholder="GG.AA.YYYY"
          value={birthDate}
          onChangeText={(v) => setBirthDate(formatBirthDateInput(v))}
        />
        <OptionPicker label="Cinsiyet" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
      </GlassCard>

      <AdminSectionHeader title="İletişim ve ödeme" />
      <GlassCard style={styles.card}>
        <AdminFormField label="Adres" value={address} onChangeText={setAddress} multiline />
        <AdminFormField
          label="IBAN"
          value={iban}
          onChangeText={(v) => setIban(formatIbanInput(v))}
        />
        <AdminFormField label="Banka adı" value={bankName} onChangeText={setBankName} />
        <AdminFormField label="Hesap sahibi" value={bankAccountName} onChangeText={setBankAccountName} />
      </GlassCard>

      <AdminSectionHeader title="Konum" />
      <GlassCard style={styles.card}>
        <RegionDistrictPicker
          regionId={regionId}
          district={district}
          onRegionChange={(nextRegionId) => {
            setRegionId(nextRegionId);
            setDistrict(null);
          }}
          onDistrictChange={setDistrict}
        />
      </GlassCard>

      <AdminSectionHeader title="Profil içeriği" />
      <GlassCard style={styles.card}>
        <AdminFormField label="Biyografi" value={bio} onChangeText={setBio} multiline />
        <AdminFormField label="Meslek / ilgi alanı" value={occupation} onChangeText={setOccupation} />
        <Text variant="caption" secondary>
          İlgi alanları
        </Text>
        <View style={styles.interestGrid}>
          {INTEREST_OPTIONS.map((option) => {
            const selected = interests.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => toggleInterest(option.id)}
                style={[
                  styles.interestChip,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? `${colors.primary}18` : `${colors.surface}88`,
                  },
                ]}
              >
                <Text variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <AdminSectionHeader title="Gizlilik" />
      <GlassCard style={styles.card}>
        <OptionPicker
          label="Profil görünürlüğü"
          options={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={setVisibility}
        />
        <View style={styles.switchRow}>
          <Text variant="caption">Profil görüntülenmeleri</Text>
          <Switch value={showProfileViews} onValueChange={setShowProfileViews} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.switchRow}>
          <Text variant="caption">Beğenilenler görünür</Text>
          <Switch value={showLikedPosts} onValueChange={setShowLikedPosts} trackColor={{ true: colors.primary }} />
        </View>
      </GlassCard>

      <Button title={saving ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'} onPress={handleSave} disabled={saving} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.md },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarActions: { flex: 1, gap: spacing.sm },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  coverPreview: { width: '100%', height: 120, borderRadius: radius.md },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  interestChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
