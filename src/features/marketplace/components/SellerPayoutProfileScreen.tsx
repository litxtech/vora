import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { marketplaceAccountPath } from '@/features/marketplace/constants';
import { fetchSellerPayoutProfile, upsertSellerPayoutProfile } from '@/features/marketplace/services/orderData';
import { formatIbanInput, validateTurkishIban } from '@/features/auth/services/validation';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function SellerPayoutProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchSellerPayoutProfile(user.id).then((p) => {
      if (!p) return;
      setAccountHolder(p.accountHolder);
      setIban(formatIbanInput(p.iban));
      setBankName(p.bankName ?? '');
      setVerifiedAt(p.verifiedAt);
    });
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;

    if (!accountHolder.trim()) {
      Alert.alert('Hata', 'Hesap sahibi adını girin.');
      return;
    }

    const ibanError = validateTurkishIban(iban);
    if (ibanError) {
      Alert.alert('Hata', ibanError);
      return;
    }

    setSaving(true);
    const result = await upsertSellerPayoutProfile({
      userId: user.id,
      accountHolder,
      iban,
      bankName,
    });
    setSaving(false);
    if (result.error) Alert.alert('Hata', result.error);
    else Alert.alert('Kaydedildi', 'IBAN bilgileriniz admin doğrulaması için gönderildi.');
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: spacing.md }}>
        <AuthHeader title="Banka & Ödeme Profili" subtitle="Satış gelirlerinizin yatırılacağı IBAN hesabı" />
        {verifiedAt ? (
          <Text variant="caption" style={{ color: '#43A047' }}>✓ Admin tarafından doğrulandı</Text>
        ) : (
          <Text secondary variant="caption">Doğrulama bekleniyor — güvenli satış için gerekli</Text>
        )}
        <Input label="Hesap sahibi" value={accountHolder} onChangeText={setAccountHolder} />
        <Input
          label="IBAN"
          value={iban}
          onChangeText={(v) => setIban(formatIbanInput(v))}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          autoCapitalize="characters"
          hint="TR ile başlayan 26 karakter (boşluklar otomatik temizlenir)"
        />
        <Input label="Banka adı" value={bankName} onChangeText={setBankName} />
        <Button title={saving ? 'Kaydediliyor...' : 'Kaydet'} onPress={save} disabled={saving} />
        <Pressable onPress={() => router.push(marketplaceAccountPath() as never)} style={styles.backLink}>
          <Ionicons name="grid-outline" size={14} color="#5C6BC0" />
          <Text variant="caption" style={{ color: '#5C6BC0' }}>
            Hesap paneline dön
          </Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: spacing.sm },
});
