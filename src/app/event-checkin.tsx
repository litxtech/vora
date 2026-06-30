import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { checkInWithQrToken } from '@/features/events/services/ticketService';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function EventCheckInLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (isLoading || processed.current) return;

    const raw = Array.isArray(token) ? token[0] : token;
    if (!raw?.trim()) {
      router.replace('/event-center/scan' as never);
      return;
    }

    if (!user) {
      router.replace('/event-center/scan' as never);
      return;
    }

    processed.current = true;

    void (async () => {
      const result = await checkInWithQrToken(raw);
      if (!result.ok) {
        Alert.alert('Giriş başarısız', result.error ?? 'QR kod geçersiz.', [
          { text: 'QR Okut', onPress: () => router.replace('/event-center/scan' as never) },
          { text: 'Kapat', onPress: () => router.replace('/(tabs)' as never) },
        ]);
        return;
      }

      Alert.alert('Giriş onaylandı', 'Etkinliğe başarıyla giriş yaptınız.', [
        {
          text: 'Tamam',
          onPress: () => {
            if (result.eventId) router.replace(`/detail/events/${result.eventId}` as never);
            else router.replace('/(tabs)' as never);
          },
        },
      ]);
    })();
  }, [isLoading, token, user]);

  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
