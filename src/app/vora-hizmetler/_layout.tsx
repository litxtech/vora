import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { getDefaultStackScreenOptions } from '@/constants/navigation';

export default function VoraHizmetlerLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create-request" />
      <Stack.Screen name="edit-request" options={{ title: 'İlanı Düzenle' }} />
      <Stack.Screen name="provider-setup" />
      <Stack.Screen name="provider-manage" options={{ title: 'Profil Yönetimi' }} />
      <Stack.Screen name="provider-edit" options={{ title: 'Profili Düzenle' }} />
      <Stack.Screen name="provider-verification" options={{ title: 'Doğrulama' }} />
      <Stack.Screen name="provider-portfolio" options={{ title: 'Portfolyo' }} />
      <Stack.Screen name="provider-certificates" options={{ title: 'Sertifikalar' }} />
      <Stack.Screen name="provider-reviews" options={{ title: 'Değerlendirmeler' }} />
      <Stack.Screen name="emergency" />
      <Stack.Screen name="emergency/respond/[sessionId]" options={{ title: 'Acil Yanıt' }} />
      <Stack.Screen name="payout-profile" options={{ title: 'Ödeme Bilgileri' }} />
      <Stack.Screen name="map" />
      <Stack.Screen name="history" />
      <Stack.Screen name="offers/[requestId]" />
      <Stack.Screen name="submit-offer/[requestId]" />
      <Stack.Screen name="review/[jobId]" />
    </Stack>
  );
}
