import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  CityPageShell,
  CitySectionTitle,
  CitySurfaceCard,
} from '@/features/city-governance/components/cityUi';
import { cityPath } from '@/features/city-governance/constants';
import { leaderLinePath } from '@/features/city-diplomacy/constants';
import {
  acceptJointRoom,
  fetchLeaderDiplomacyRequests,
  fetchPendingDiplomacyForLeader,
  proposeJointRoom,
  respondDiplomacyRequest,
  sendDiplomacyRequest,
} from '@/features/city-diplomacy/services/diplomacyData';
import { DIPLOMACY_REQUEST_LABELS } from '@/features/city-diplomacy/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import type { RegionId } from '@/constants/regions';
import { REGIONS } from '@/constants/regions';

type CityLeaderPanelScreenProps = {
  slug: string;
  regionId: RegionId;
  regionName: string;
};

export function CityLeaderPanelScreen({ slug, regionId, regionName }: CityLeaderPanelScreenProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState<Awaited<ReturnType<typeof fetchPendingDiplomacyForLeader>>>([]);
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof fetchLeaderDiplomacyRequests>>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setPending(await fetchPendingDiplomacyForLeader(user.id));
      setRecent(await fetchLeaderDiplomacyRequests(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const respond = async (requestId: string, accept: boolean) => {
    setBusy(true);
    try {
      const result = await respondDiplomacyRequest(requestId, accept);
      if (accept && result.callSessionId) {
        router.push(leaderLinePath(result.callSessionId));
      }
      await reload();
    } catch (err) {
      Alert.alert('Diplomasi', err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  const startLeaderCall = async (toRegionId: RegionId) => {
    setBusy(true);
    try {
      await sendDiplomacyRequest(toRegionId, 'leader_call', 'Lider hattı', 'Görüşme talebi');
      Alert.alert('Gönderildi', 'Karşı lider talebi alacak.');
      await reload();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Gönderilemedi');
    } finally {
      setBusy(false);
    }
  };

  const onProposeMerge = async (requestId: string) => {
    setBusy(true);
    try {
      await proposeJointRoom(requestId);
      Alert.alert('Teklif gönderildi', 'Karşı lider onaylayabilir.');
      await reload();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Teklif gönderilemedi');
    } finally {
      setBusy(false);
    }
  };

  const onAcceptMerge = async (requestId: string) => {
    setBusy(true);
    try {
      const roomId = await acceptJointRoom(requestId);
      router.push(`/room/${roomId}`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Oda oluşturulamadı');
    } finally {
      setBusy(false);
    }
  };

  const otherCities = REGIONS.filter((r) => r.id !== regionId && r.phase <= 2);

  return (
    <CityPageShell
      slug={slug}
      regionName={regionName}
      activeTab="leader"
      subtitle="Diplomasi talepleri, lider hattı ve ortak odalar"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Bekleyen Talepler" icon="mail-unread-outline" />
        {pending.length === 0 ? (
          <Text secondary>Şu an bekleyen talep yok.</Text>
        ) : (
          pending.map((req) => (
            <View key={req.id} style={styles.requestBlock}>
              <Text variant="label">
                {req.fromRegionName} · {DIPLOMACY_REQUEST_LABELS[req.requestType]}
              </Text>
              {req.message ? <Text secondary>{req.message}</Text> : null}
              <View style={styles.row}>
                <Button size="compact" onPress={() => void respond(req.id, true)} loading={busy}>
                  Kabul Et
                </Button>
                <Button size="compact" variant="outline" onPress={() => void respond(req.id, false)}>
                  Reddet
                </Button>
              </View>
            </View>
          ))
        )}
      </CitySurfaceCard>

      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Hızlı İşlemler" icon="flash-outline" />
        <Button variant="outline" onPress={() => router.push(`${cityPath(slug)}/diplomacy`)}>
          Diplomasi Ekranı
        </Button>
        <Button variant="outline" onPress={() => router.push(`${cityPath(slug)}/council`)}>
          Meclisi Yönet
        </Button>
      </CitySurfaceCard>

      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Diğer Şehir Liderleri" icon="call-outline" />
        {otherCities.map((city) => (
          <View key={city.id} style={styles.row}>
            <Text>{city.name}</Text>
            <Button size="compact" onPress={() => void startLeaderCall(city.id)} loading={busy}>
              Görüş
            </Button>
          </View>
        ))}
      </CitySurfaceCard>

      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Son Diplomasi" icon="time-outline" />
        {recent.slice(0, 8).map((req) => (
          <View key={req.id} style={styles.requestBlock}>
            <Text variant="caption">
              {req.fromRegionName} → {req.toRegionName} · {req.status}
            </Text>
            {req.status === 'accepted' && req.callSessionId ? (
              <Button size="compact" onPress={() => router.push(leaderLinePath(req.callSessionId!))}>
                Lider Hattı
              </Button>
            ) : null}
            {req.status === 'accepted' && req.requestType === 'joint_room' && !req.voiceRoomId ? (
              <Button size="compact" onPress={() => void onAcceptMerge(req.id)}>
                Ortak Odayı Aç
              </Button>
            ) : null}
            {req.status === 'accepted' && req.callSessionId && !req.voiceRoomId ? (
              <Button size="compact" variant="outline" onPress={() => void onProposeMerge(req.id)}>
                Ortak Oda Teklif Et
              </Button>
            ) : null}
            {req.voiceRoomId ? (
              <Button size="compact" onPress={() => router.push(`/room/${req.voiceRoomId}`)}>
                Ortak Odaya Git
              </Button>
            ) : null}
          </View>
        ))}
      </CitySurfaceCard>
    </CityPageShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  requestBlock: { gap: spacing.sm, paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
