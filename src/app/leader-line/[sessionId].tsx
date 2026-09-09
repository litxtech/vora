import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { acceptJointRoom, proposeJointRoom } from '@/features/city-diplomacy/services/diplomacyData';
import { supabase } from '@/lib/supabase/client';
import { spacing } from '@/constants/theme';

export default function LeaderLineRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  if (!sessionId || typeof sessionId !== 'string') {
    return <Redirect href="/(tabs)/discover" />;
  }

  return <LeaderLineBridge sessionId={sessionId} />;
}

function LeaderLineBridge({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    router.replace({ pathname: '/call/[sessionId]', params: { sessionId } });
  }, [sessionId]);

  const findRequestAndPropose = async () => {
    const { data } = await supabase
      .from('city_diplomacy_requests')
      .select('id')
      .eq('call_session_id', sessionId)
      .maybeSingle();
    if (!data?.id) return;
    try {
      await proposeJointRoom(data.id);
      Alert.alert('Teklif gönderildi', 'Karşı lider ortak odayı onaylayabilir.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Teklif gönderilemedi');
    }
  };

  const findRequestAndAccept = async () => {
    const { data } = await supabase
      .from('city_diplomacy_requests')
      .select('id')
      .eq('call_session_id', sessionId)
      .maybeSingle();
    if (!data?.id) return;
    try {
      const roomId = await acceptJointRoom(data.id);
      router.replace(`/room/${roomId}`);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Oda açılamadı');
    }
  };

  return (
    <GradientBackground>
      <View style={styles.wrap}>
        <ActivityIndicator />
        <Text secondary>Lider hattına bağlanılıyor...</Text>
        <GlassCard style={styles.card}>
          <Text variant="label">Lider Hattı</Text>
          <Button onPress={() => void findRequestAndPropose()}>🤝 Şehirleri Birleştir</Button>
          <Button variant="outline" onPress={() => void findRequestAndAccept()}>
            Ortak Odayı Kabul Et
          </Button>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  card: { gap: spacing.sm, padding: spacing.lg, width: '100%' },
});
