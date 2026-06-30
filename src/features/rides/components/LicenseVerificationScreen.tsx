import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { ListingFormSection } from '@/features/marketplace/components/ListingFormSection';
import { RIDES_ACCENT } from '@/features/rides/constants';
import { fetchLicenseVerificationStatus, submitLicenseVerification } from '@/features/rides/services/licenseData';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

function PhotoSlot({ label, uri, onPick }: { label: string; uri: string | null; onPick: () => void }) {
  return (
    <Pressable onPress={onPick} style={styles.photoSlot}>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="camera-outline" size={28} color={RIDES_ACCENT} />
          <Text variant="caption">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function LicenseVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchLicenseVerificationStatus(user.id).then((s) => {
      setStatus(s.status);
      setRejectionReason(s.rejectionReason);
    });
  }, [user?.id]);

  const pick = async (setter: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  };

  const submit = async () => {
    if (!user?.id || !frontUri || !selfieUri) {
      Alert.alert('Eksik', 'Ehliyet ön yüz ve selfie zorunlu.');
      return;
    }
    setSaving(true);
    const { error } = await submitLicenseVerification({
      userId: user.id,
      frontUri,
      backUri: backUri ?? undefined,
      selfieUri,
    });
    setSaving(false);
    if (error) Alert.alert('Hata', error);
    else {
      Alert.alert('Gönderildi', 'Ehliyet doğrulamanız inceleniyor.', [{ text: 'Tamam', onPress: () => router.back() }]);
    }
  };

  const canSubmit = status === 'none' || status === 'rejected';

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.sm }}>
        <AuthHeader title="Ehliyet Doğrulama" subtitle="Sürücü olarak yolculuk paylaşmak için" showBack />

        {status === 'approved' ? (
          <Text variant="caption" style={{ color: '#43A047' }}>✓ Ehliyetiniz doğrulandı</Text>
        ) : status === 'pending' ? (
          <Text secondary variant="caption">Doğrulama bekleniyor</Text>
        ) : status === 'rejected' ? (
          <Text variant="caption" style={{ color: '#D32F2F' }}>
            Reddedildi{rejectionReason ? `: ${rejectionReason}` : ''}. Tekrar gönderebilirsiniz.
          </Text>
        ) : null}

        {canSubmit ? (
          <ListingFormSection step={1} title="Belge fotoğrafları">
            <PhotoSlot label="Ehliyet ön" uri={frontUri} onPick={() => pick(setFrontUri)} />
            <PhotoSlot label="Ehliyet arka (opsiyonel)" uri={backUri} onPick={() => pick(setBackUri)} />
            <PhotoSlot label="Selfie + ehliyet" uri={selfieUri} onPick={() => pick(setSelfieUri)} />
            <Button title="Doğrulama için gönder" loading={saving} onPress={submit} />
          </ListingFormSection>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  photoSlot: { marginBottom: spacing.sm },
  photo: { width: '100%', height: 160, borderRadius: 12 },
  photoPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
