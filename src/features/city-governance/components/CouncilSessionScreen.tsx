import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { CITY_GOVERNANCE_ACCENT, cityPath } from '@/features/city-governance/constants';
import {
  fetchCouncilSession,
  fetchCouncilSessionDecisions,
  type CouncilDecision,
  type CouncilSession,
} from '@/features/city-governance/services/cityCouncil';
import { roomSharePath } from '@/features/city-voice/services/voiceRoomService';
import { spacing } from '@/constants/theme';
import { APP_SHARE_BASE_URL } from '@/constants/app';

type Props = { sessionId: string };

function sessionStatusLabel(status: string): string {
  switch (status) {
    case 'live':
      return 'Canlı';
    case 'scheduled':
      return 'Planlandı';
    case 'completed':
      return 'Tamamlandı';
    case 'cancelled':
      return 'İptal';
    default:
      return status;
  }
}

export function CouncilSessionScreen({ sessionId }: Props) {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<CouncilSession | null>(null);
  const [decisions, setDecisions] = useState<CouncilDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSession, nextDecisions] = await Promise.all([
        fetchCouncilSession(sessionId),
        fetchCouncilSessionDecisions(sessionId),
      ]);
      setSession(nextSession);
      setDecisions(nextDecisions);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const shareSession = async () => {
    if (!session) return;
    const url = `${APP_SHARE_BASE_URL}/council/${session.id}`;
    await Share.share({
      message: `🏛️ ${session.title}\n${session.regionName} Meclis Oturumu\n\nVora'ya Gel.\n${url}`,
      url,
    });
  };

  const joinVoiceRoom = () => {
    if (!session?.voiceRoomId) return;
    router.push(roomSharePath(session.voiceRoomId));
  };

  if (!loading && !session) {
    return (
      <GradientBackground>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}>
          <ScreenBackButton />
          <GlassCard style={styles.card}>
            <Text variant="h3">Oturum bulunamadı</Text>
            <Text secondary>Bu meclis oturumu kaldırılmış veya erişimin yok.</Text>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
      >
        <ScreenBackButton />
        {session ? (
          <>
            <Text variant="caption" style={{ color: CITY_GOVERNANCE_ACCENT, fontWeight: '700' }}>
              🏛️ MECLİS OTURUMU
            </Text>
            <Text variant="h1">{session.title}</Text>
            <Text secondary>
              {session.regionName} · {sessionStatusLabel(session.status)}
            </Text>

            <GlassCard style={styles.card}>
              {session.agenda ? <Text>{session.agenda}</Text> : <Text secondary>Gündem maddesi eklenmemiş.</Text>}
              <Button variant="outline" onPress={() => void shareSession()}>
                Vora&apos;ya Gel — Paylaş
              </Button>
              <Button variant="outline" onPress={() => router.push(cityPath(session.regionId))}>
                Şehir Sayfasına Git
              </Button>
              {session.voiceRoomId && session.status === 'live' ? (
                <Button onPress={joinVoiceRoom}>Sesli Odaya Katıl</Button>
              ) : null}
            </GlassCard>

            {decisions.length > 0 ? (
              <GlassCard style={styles.card}>
                <Text variant="h3">Kararlar</Text>
                {decisions.map((decision) => (
                  <GlassCard key={decision.id} style={styles.decisionCard}>
                    <Text variant="label">{decision.title}</Text>
                    <Text secondary>{decision.decisionText}</Text>
                    <Text variant="caption">{decision.status}</Text>
                  </GlassCard>
                ))}
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm, padding: spacing.lg },
  decisionCard: { gap: spacing.xs, padding: spacing.md },
});
