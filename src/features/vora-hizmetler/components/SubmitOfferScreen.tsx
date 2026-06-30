import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { HizmetFormStep, HizmetHeroBanner } from '@/features/vora-hizmetler/components/HizmetUi';
import { createServiceOffer } from '@/features/vora-hizmetler/services/offerData';
import { fetchProviderByUserId } from '@/features/vora-hizmetler/services/providerData';
import { serviceRequestDetailPath } from '@/features/vora-hizmetler/constants';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function SubmitOfferScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { user } = useAuth();

  const [price, setPrice] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [message, setMessage] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || !requestId) return;

    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      Alert.alert('Geçersiz fiyat', 'Geçerli bir fiyat girin.');
      return;
    }

    const providerRes = await fetchProviderByUserId(user.id);
    if (!providerRes.provider) {
      Alert.alert('Profil gerekli', 'Teklif vermek için önce usta profilinizi oluşturun.', [
        { text: 'Tamam', onPress: () => router.push('/vora-hizmetler/provider-setup' as never) },
      ]);
      return;
    }

    setSaving(true);
    const result = await createServiceOffer({
      requestId,
      providerId: providerRes.provider.id,
      price: priceNum,
      estimatedArrival: arrivalTime ? new Date(arrivalTime).toISOString() : null,
      message: message.trim() || null,
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : null,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    Alert.alert(
      result.revised ? 'Teklif güncellendi' : 'Teklif gönderildi',
      result.revised
        ? 'Müşteri push bildirimi alacak.'
        : 'Müşteri push bildirimi ile bilgilendirilecek.',
      [{ text: 'Tamam', onPress: () => router.replace(serviceRequestDetailPath(requestId) as never) }],
    );
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
          title="Teklif Ver"
          subtitle="Fiyatınızı, geliş sürenizi ve garanti koşullarınızı belirtin"
          icon="pricetag-outline"
          compact
        />

        <HizmetFormStep step={1} title="Fiyat & Süre">
          <Input label="Fiyat (TL)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="1200" />
          <Input
            label="Tahmini Geliş"
            value={arrivalTime}
            onChangeText={setArrivalTime}
            placeholder="Bugün saat 18:00"
          />
        </HizmetFormStep>

        <HizmetFormStep step={2} title="Garanti & Mesaj">
          <Input
            label="Garanti Süresi (Ay)"
            value={warrantyMonths}
            onChangeText={setWarrantyMonths}
            keyboardType="numeric"
            placeholder="6"
          />
          <Input
            label="Müşteriye Mesaj"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            placeholder="İşçilik garantisi dahil, malzeme ayrı…"
            style={styles.textArea}
          />
        </HizmetFormStep>

        <Button title="Teklifi Gönder" onPress={handleSubmit} loading={saving} style={styles.submit} />
      </KeyboardAwareScrollView>
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
