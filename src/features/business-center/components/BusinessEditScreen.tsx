import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import { BUSINESS_ACCENT, BUSINESS_ROUTES } from '@/features/business-center/constants';
import { BusinessSectorPicker } from '@/features/business-center/components/BusinessSectorPicker';
import { BusinessShopPersonalToggle } from '@/features/business-center/components/BusinessShopPersonalToggle';
import { updateBusinessShopSettings } from '@/features/business-center/services/businessAccountData';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import type { BusinessAccountRecord } from '@/features/business-center/types';
import { fetchLinkedSiblingProfile } from '@/features/account-switch/services/linkedAccounts';
import type { LinkedSiblingProfile } from '@/features/account-switch/types';
import type { RegionId } from '@/constants/regions';
import type { BusinessCategoryId } from '@/constants/registration';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BusinessEditScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessAccountRecord | null>(null);
  const [category, setCategory] = useState<BusinessCategoryId | null>(null);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<RegionId>('trabzon');
  const [shopTagline, setShopTagline] = useState('');
  const [shopPublished, setShopPublished] = useState(false);
  const [shopShowOnPersonal, setShopShowOnPersonal] = useState(false);
  const [linkedSibling, setLinkedSibling] = useState<LinkedSiblingProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([fetchBusinessAccountByOwner(user.id), fetchLinkedSiblingProfile()]).then(
      ([biz, sibling]) => {
        setLinkedSibling(sibling);
        if (!biz) return;
        setBusiness(biz);
        setCategory((biz.category as BusinessCategoryId) ?? null);
        setDescription(biz.description ?? '');
        setPhone(biz.phone ?? '');
        setWebsite(biz.website ?? '');
        setAddress(biz.address ?? '');
        setDistrict(biz.district);
        setRegionId(biz.regionId as RegionId);
        setShopTagline(biz.shopTagline ?? '');
        setShopPublished(biz.shopPublished);
        setShopShowOnPersonal(biz.shopShowOnPersonal);
      },
    );
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id || !business) return;
    setSaving(true);
    const { error } = await updateBusinessShopSettings(business.id, user.id, {
      category: category ?? undefined,
      description: description.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      address: address.trim() || null,
      district: district?.trim() || null,
      shopTagline: shopTagline.trim() || null,
      shopPublished,
      shopShowOnPersonal: shopPublished ? shopShowOnPersonal : false,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    Alert.alert('Kaydedildi', 'İşletme bilgileri güncellendi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  if (!business) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.md }]}>
          <Text secondary>İşletme kaydı bulunamadı.</Text>
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
      >
        <AuthHeader title="İşletme Bilgileri" subtitle={business.name} />

        <GlassCard style={styles.field}>
          <BusinessSectorPicker
            value={category}
            onChange={setCategory}
            accent={BUSINESS_ACCENT}
            compact
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <Text variant="label">Açıklama</Text>
          <TextInput
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={800}
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <Text variant="label">Vitrin sloganı</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={shopTagline}
            onChangeText={setShopTagline}
            maxLength={120}
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <Text variant="label">Telefon</Text>
          <Text secondary variant="caption">
            İşletme profilinde görünür; mağaza vitrininde gösterilmez.
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <Text variant="label">Web sitesi</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <Text variant="label">Adres</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={address}
            onChangeText={setAddress}
          />
          <RegionDistrictPicker
            regionId={regionId}
            district={district}
            onRegionChange={setRegionId}
            onDistrictChange={(d) => setDistrict(d)}
          />
        </GlassCard>

        <GlassCard style={styles.field}>
          <View style={styles.switchRow}>
            <Text variant="label">Mağaza yayında</Text>
            <Switch
              value={shopPublished}
              onValueChange={(v) => {
                setShopPublished(v);
                if (!v) setShopShowOnPersonal(false);
              }}
              trackColor={{ true: BUSINESS_ACCENT }}
            />
          </View>
          <BusinessShopPersonalToggle
            linkedSibling={linkedSibling}
            shopPublished={shopPublished}
            value={shopShowOnPersonal}
            onValueChange={setShopShowOnPersonal}
          />
        </GlassCard>

        <Button title={saving ? 'Kaydediliyor...' : 'Kaydet'} onPress={handleSave} disabled={saving} />

        <Button
          title="Mağaza modunu değiştir"
          variant="secondary"
          onPress={() => router.push(BUSINESS_ROUTES.setup as never)}
        />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  field: { gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
