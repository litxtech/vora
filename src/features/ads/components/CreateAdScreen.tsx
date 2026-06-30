import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { AD_CPC_CENTS, AD_TYPES, INTEREST_OPTIONS, MIN_AD_BUDGET_CENTS } from '@/features/ads/constants';
import { createBusinessAd } from '@/features/ads/services/adData';
import type { AdType } from '@/features/ads/types';
import { fetchBusinessByOwner } from '@/features/profile/services/businessProfile';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CreateAdScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [adType, setAdType] = useState<AdType>('feed');
  const [budget, setBudget] = useState('500');
  const [regionId, setRegionId] = useState<RegionId | null>(null);
  const [district, setDistrict] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBusinessByOwner(user.id).then((b) => {
      setBusinessId(b?.id ?? null);
      if (b?.region_id) setRegionId(b.region_id as RegionId);
    });
  }, [user]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleCreate = async () => {
    if (!user || !businessId || !title.trim() || !description.trim()) {
      Alert.alert('Eksik', 'Başlık ve açıklama gerekli.');
      return;
    }

    const budgetCents = Math.round(parseFloat(budget.replace(',', '.')) * 100);
    if (!Number.isFinite(budgetCents) || budgetCents < MIN_AD_BUDGET_CENTS) {
      Alert.alert('Bütçe', `Minimum bütçe ${MIN_AD_BUDGET_CENTS / 100} ₺ olmalıdır.`);
      return;
    }

    setLoading(true);
    const { error } = await createBusinessAd(businessId, user.id, {
      title: title.trim(),
      description: description.trim(),
      adType,
      billingMode: 'wallet_cpc',
      budgetCents,
      cpcCents: AD_CPC_CENTS,
      targetRegionId: regionId,
      targetDistrict: district.trim() || null,
      targetAgeMin: ageMin ? parseInt(ageMin, 10) : null,
      targetAgeMax: ageMax ? parseInt(ageMax, 10) : null,
      targetInterests: interests,
      endsAt: null,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Oluşturuldu', 'Reklamınız onay için gönderildi.', [
      { text: 'Tamam', onPress: () => router.replace('/ads' as never) },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.page,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <AuthHeader title="Reklam Oluştur" subtitle="Hedefleme ve bütçe ayarlayın" />

      <Input label="Başlık" value={title} onChangeText={setTitle} placeholder="Reklam başlığı" />
      <Input
        label="Açıklama"
        value={description}
        onChangeText={setDescription}
        placeholder="Reklam metni"
        multiline
      />
      <Input
        label="Bütçe (₺)"
        value={budget}
        onChangeText={setBudget}
        placeholder="500"
        keyboardType="numeric"
      />

      <Text variant="label">Reklam Türü</Text>
      <View style={styles.chipRow}>
        {AD_TYPES.map((t) => (
          <Button
            key={t.id}
            title={t.label}
            fullWidth={false}
            variant={adType === t.id ? 'primary' : 'outline'}
            onPress={() => setAdType(t.id)}
          />
        ))}
      </View>

      <Text variant="label">Hedef İl</Text>
      <View style={styles.chipRow}>
        {REGIONS.map((r) => (
          <Button
            key={r.id}
            title={r.name}
            fullWidth={false}
            variant={regionId === r.id ? 'primary' : 'outline'}
            onPress={() => setRegionId(r.id)}
          />
        ))}
      </View>

      <Input label="Hedef İlçe" value={district} onChangeText={setDistrict} placeholder="Opsiyonel" />

      <View style={styles.ageRow}>
        <View style={styles.ageField}>
          <Input label="Min Yaş" value={ageMin} onChangeText={setAgeMin} keyboardType="numeric" />
        </View>
        <View style={styles.ageField}>
          <Input label="Max Yaş" value={ageMax} onChangeText={setAgeMax} keyboardType="numeric" />
        </View>
      </View>

      <Text variant="label">İlgi Alanları</Text>
      <View style={styles.chipRow}>
        {INTEREST_OPTIONS.map((interest) => (
          <Button
            key={interest}
            title={interest}
            fullWidth={false}
            variant={interests.includes(interest) ? 'primary' : 'outline'}
            onPress={() => toggleInterest(interest)}
          />
        ))}
      </View>

      <Button title="Reklam Oluştur" onPress={handleCreate} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  ageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ageField: {
    flex: 1,
  },
});
