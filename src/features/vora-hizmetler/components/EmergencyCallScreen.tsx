import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { HizmetChipPicker } from '@/features/vora-hizmetler/components/HizmetChipPicker';
import {
  SERVICE_CATEGORY_OPTIONS,
  serviceRequestDetailPath,
} from '@/features/vora-hizmetler/constants';
import {
  fetchEmergencySession,
  subscribeEmergencySession,
} from '@/features/vora-hizmetler/services/emergencyData';
import { createEmergencySession } from '@/features/vora-hizmetler/services/providerData';
import { resolveServiceLocation } from '@/features/vora-hizmetler/services/location';
import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import { regionNameById } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const EMERGENCY_GRADIENT = ['#EF4444', '#F97316'] as const;

export function EmergencyCallScreen() {
  const { user, profile } = useAuth();
  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const [category, setCategory] = useState<ServiceCategory>('elektrik');
  const [calling, setCalling] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [matchedProviderName, setMatchedProviderName] = useState<string | null>(null);
  const [matchedRequestId, setMatchedRequestId] = useState<string | null>(null);

  const pollSession = useCallback(async (id: string) => {
    const result = await fetchEmergencySession(id);
    if (!result.session) return;
    if (result.session.matchedProviderId) {
      setMatchedProviderName(result.session.matchedProviderName);
      setMatchedRequestId(result.session.requestId);
      setWaiting(false);
    } else if (result.session.isExpired) {
      setWaiting(false);
      Alert.alert('Süre doldu', 'Henüz usta kabul etmedi. Tekrar deneyebilirsiniz.');
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !waiting) return undefined;
    const unsub = subscribeEmergencySession(sessionId, () => void pollSession(sessionId));
    const timer = setInterval(() => void pollSession(sessionId), 5000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [sessionId, waiting, pollSession]);

  const handleEmergency = async () => {
    if (!user?.id) return;

    const location = await resolveServiceLocation(regionId);
    if (location.error) {
      Alert.alert('Konum gerekli', location.error);
      return;
    }

    setCalling(true);
    const result = await createEmergencySession({
      requesterId: user.id,
      category,
      regionId,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setCalling(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    if (!result.notifiedCount) {
      Alert.alert(
        'Bildirim gönderilemedi',
        `${regionNameById(regionId)} bölgesinde bildirim alabilecek aktif kullanıcı bulunamadı.`,
      );
      return;
    }

    setMatchedProviderName(null);
    setMatchedRequestId(null);
    setSessionId(result.sessionId ?? null);
    setWaiting(true);
    Alert.alert(
      'Acil çağrı gönderildi',
      `${result.notifiedCount} ustaya bildirim gitti. Usta kabul edince burada göreceksiniz.`,
    );
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        <LinearGradient colors={[...EMERGENCY_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.pulseRing}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash" size={36} color="#fff" />
            </View>
          </View>
          <Text variant="h2" style={styles.heroTitle}>
            Acil Çağır
          </Text>
          <Text variant="body" style={styles.heroDesc}>
            Bölgenizdeki uygun ustalara anında bildirim gider. Tam konum paylaşılmaz; yaklaşık mesafe gösterilir.
          </Text>
        </LinearGradient>

        <GlassCard style={styles.form}>
          <Text variant="label">Hizmet Türü</Text>
          <Text secondary variant="caption" style={styles.formHint}>
            Acil müdahale gerektiren kategoriyi seçin
          </Text>
          <HizmetChipPicker
            options={SERVICE_CATEGORY_OPTIONS.filter((c) =>
              ['elektrik', 'su_tesisati', 'kombi', 'klima', 'oto_tamir', 'cekici', 'temizlik'].includes(c.value),
            ).map((o) => ({ value: o.value, label: o.label, icon: o.icon, color: o.color }))}
            value={category}
            onChange={setCategory}
          />
        </GlassCard>

        <View style={styles.infoRow}>
          <InfoTile icon="location-outline" label="Konum gizli" desc="Yaklaşık mesafe" />
          <InfoTile icon="notifications-outline" label="Anında" desc="Push bildirim" />
          <InfoTile icon="timer-outline" label="15 dk" desc="Aktif oturum" />
        </View>

        {waiting ? (
          <View style={styles.callingBox}>
            <ActivityIndicator color="#EF4444" size="large" />
            <Text variant="label" style={{ color: '#EF4444', marginTop: spacing.md }}>
              Usta bekleniyor…
            </Text>
            <Text secondary variant="caption" style={{ textAlign: 'center', marginTop: spacing.sm }}>
              Yakın ustalar bildirim aldı. Kabul edilince yönlendirileceksiniz.
            </Text>
          </View>
        ) : matchedRequestId ? (
          <GlassCard style={styles.matchedCard}>
            <Text variant="label">{matchedProviderName ?? 'Usta'} kabul etti</Text>
            <Button
              title="İş Detayına Git"
              onPress={() => router.push(serviceRequestDetailPath(matchedRequestId) as never)}
              style={styles.btn}
            />
          </GlassCard>
        ) : (
          <Button
            title="Acil Çağrı Başlat"
            variant="danger"
            onPress={handleEmergency}
            loading={calling}
            style={styles.btn}
          />
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function InfoTile({
  icon,
  label,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
}) {
  return (
    <View style={styles.infoTile}>
      <Ionicons name={icon} size={18} color="#EF4444" />
      <Text variant="caption" style={{ fontWeight: '700' }}>
        {label}
      </Text>
      <Text secondary variant="caption">
        {desc}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pulseRing: {
    padding: 8,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  formHint: {
    marginTop: -spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  infoTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#EF444412',
  },
  callingBox: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btn: {
    marginTop: spacing.md,
  },
  matchedCard: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
