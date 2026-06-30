import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import {
  serviceCategoryLabel,
  serviceRequestDetailPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import {
  acceptEmergencySession,
  fetchEmergencySession,
  type EmergencySessionSummary,
} from '@/features/vora-hizmetler/services/emergencyData';
import { radius, spacing } from '@/constants/theme';

const EMERGENCY_GRADIENT = ['#EF4444', '#F97316'] as const;

export function EmergencyRespondScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<EmergencySessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const result = await fetchEmergencySession(sessionId);
    setSession(result.session);
    setLoading(false);
    if (result.error) Alert.alert('Hata', result.error);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAccept = () => {
    if (!sessionId) return;
    Alert.alert('Acil çağrıyı kabul et', 'Kabul edince müşteriye bildirim gider ve iş kaydı oluşur.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kabul Et',
        onPress: async () => {
          setAccepting(true);
          const result = await acceptEmergencySession(sessionId);
          setAccepting(false);
          if (result.error) {
            Alert.alert('Hata', result.error);
            return;
          }
          if (result.requestId) {
            Alert.alert('Kabul edildi', 'Müşteriye bildirim gitti.', [
              {
                text: 'İşe Git',
                onPress: () =>
                  router.replace(serviceRequestDetailPath(result.requestId!) as never),
              },
            ]);
          } else {
            await load();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <GradientBackground>
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
      </GradientBackground>
    );
  }

  if (!session) {
    return (
      <GradientBackground>
        <ScreenBackButton />
        <Text variant="body" style={styles.loader}>
          Oturum bulunamadı.
        </Text>
      </GradientBackground>
    );
  }

  const matched = !!session.matchedProviderId;
  const expired = session.isExpired;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        <LinearGradient colors={[...EMERGENCY_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="flash" size={32} color="#fff" />
          <Text variant="h2" style={styles.heroTitle}>
            Acil Çağrı
          </Text>
          <Text variant="body" style={styles.heroDesc}>
            {serviceCategoryLabel(session.category)}
          </Text>
        </LinearGradient>

        <GlassCard style={styles.card}>
          {matched ? (
            <>
              <Text variant="label">Başka usta kabul etti</Text>
              <Text secondary variant="body">
                {session.matchedProviderName ?? 'Usta'} bu çağrıyı aldı.
              </Text>
            </>
          ) : expired ? (
            <>
              <Text variant="label">Süre doldu</Text>
              <Text secondary variant="body">
                Bu acil çağrının süresi dolmuş.
              </Text>
            </>
          ) : (
            <>
              <Text variant="label">Yanıt bekleniyor</Text>
              <Text secondary variant="body" style={styles.desc}>
                Yaklaşık mesafe bilgisi push bildiriminde paylaşıldı. Kabul ederseniz müşteriye anında bildirim gider.
              </Text>
              <Button title="Çağrıyı Kabul Et" variant="danger" onPress={handleAccept} loading={accepting} />
            </>
          )}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  loader: {
    marginTop: 100,
    alignSelf: 'center',
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroTitle: {
    color: '#fff',
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.92)',
  },
  card: {
    gap: spacing.md,
  },
  desc: {
    lineHeight: 20,
  },
});
