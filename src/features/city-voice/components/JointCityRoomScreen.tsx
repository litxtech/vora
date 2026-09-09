import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LiveKitRoom, registerGlobals } from '@livekit/react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { CITY_GOVERNANCE_ACCENT } from '@/features/city-governance/constants';
import { CITY_VOICE_ROOMS_FEATURE } from '@/features/city-governance/featureFlags';
import {
  approveSpeaker,
  buildRoomShareMessage,
  endCityVoiceRoom,
  fetchCityVoiceRoom,
  fetchLiveKitToken,
  fetchRoomParticipants,
  fetchSpeakerRequests,
  joinCityVoiceRoom,
  leaveCityVoiceRoom,
  requestSpeaker,
  roomSharePath,
  type CityVoiceParticipant,
  type CityVoiceRoom,
} from '@/features/city-voice/services/voiceRoomService';
import { regionNameById } from '@/constants/regions';
import { APP_SHARE_BASE_URL } from '@/constants/app';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useTheme } from '@/providers/ThemeProvider';

let globalsRegistered = false;

type JointCityRoomScreenProps = {
  roomId: string;
};

export function JointCityRoomScreen({ roomId }: JointCityRoomScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const voiceVisible = useFeatureVisible(CITY_VOICE_ROOMS_FEATURE.id);
  const [room, setRoom] = useState<CityVoiceRoom | null>(null);
  const [participants, setParticipants] = useState<CityVoiceParticipant[]>([]);
  const [speakerRequests, setSpeakerRequests] = useState<Array<{ user_id: string; profiles: { username: string; full_name: string | null } | { username: string; full_name: string | null }[] }>>([]);
  const [tokenBundle, setTokenBundle] = useState<{ token: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (!globalsRegistered) {
        registerGlobals();
        globalsRegistered = true;
      }
      await joinCityVoiceRoom(roomId);
      const r = await fetchCityVoiceRoom(roomId);
      setRoom(r);
      setParticipants(await fetchRoomParticipants(roomId));
      setSpeakerRequests(await fetchSpeakerRequests(roomId));
      const tk = await fetchLiveKitToken(roomId);
      setTokenBundle({ token: tk.token, url: tk.url });
    } catch (err) {
      Alert.alert('Oda', err instanceof Error ? err.message : 'Oda açılamadı');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void reload();
    return () => {
      void leaveCityVoiceRoom(roomId).catch(() => undefined);
    };
  }, [reload, roomId]);

  const onShare = async () => {
    if (!room) return;
    const url = `${APP_SHARE_BASE_URL}${roomSharePath(room.id)}`;
    await Share.share({
      message: buildRoomShareMessage(room.title, room.listenerCount, url),
      url,
    });
  };

  const onLeave = async () => {
    setBusy(true);
    try {
      await leaveCityVoiceRoom(roomId);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const onRequestSpeak = async () => {
    setBusy(true);
    try {
      await requestSpeaker(roomId);
      Alert.alert('Söz isteği', 'Liderin onayını bekliyorsun.');
      setSpeakerRequests(await fetchSpeakerRequests(roomId));
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'İstek gönderilemedi');
    } finally {
      setBusy(false);
    }
  };

  if (!voiceVisible) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ScreenBackButton />
          <Text secondary>Sesli odalar bu ortamda kapalı.</Text>
        </View>
      </GradientBackground>
    );
  }

  if (loading || !room || !tokenBundle) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} />
          <Text secondary style={{ marginTop: spacing.md }}>Odaya bağlanılıyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  const grouped = room.regionIds.map((regionId) => ({
    regionId,
    regionName: regionNameById(regionId) ?? regionId,
    members: participants.filter((p) => p.regionId === regionId),
  }));

  const myParticipant = participants.find((p) => p.userId === user?.id);
  const isLeader = myParticipant?.role === 'city_leader';

  return (
    <GradientBackground>
      <LiveKitRoom
        serverUrl={tokenBundle.url}
        token={tokenBundle.token}
        connect
        audio
        video={false}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => void reload()} />}
        >
          <View style={styles.topRow}>
            <ScreenBackButton />
            <View style={styles.livePill}>
              <Text style={styles.liveText}>🔴 CANLI · {room.listenerCount} kişi</Text>
            </View>
          </View>

          <Text variant="h1" style={styles.title}>{room.title}</Text>

          {grouped.map((group) => (
            <GlassCard key={group.regionId} style={styles.card}>
              <Text variant="label">{group.regionName.toUpperCase()}</Text>
              {group.members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <Text>
                    {m.role === 'city_leader' ? '👑 ' : m.role === 'speaker' ? '🎙️ ' : '○ '}
                    {m.fullName ?? m.username}
                  </Text>
                </View>
              ))}
            </GlassCard>
          ))}

          {isLeader && speakerRequests.length > 0 ? (
            <GlassCard style={styles.card}>
              <Text variant="label">Söz istekleri</Text>
              {speakerRequests.map((req) => {
                const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
                return (
                  <View key={req.user_id} style={styles.memberRow}>
                    <Text>{profile?.full_name ?? profile?.username}</Text>
                    <Button
                      size="compact"
                      onPress={() => {
                        void approveSpeaker(roomId, req.user_id).then(() => reload());
                      }}
                    >
                      Onayla
                    </Button>
                  </View>
                );
              })}
            </GlassCard>
          ) : null}

          <View style={styles.actions}>
            {myParticipant?.role === 'listener' ? (
              <Button variant="outline" onPress={() => void onRequestSpeak()} loading={busy}>
                ✋ Söz İste
              </Button>
            ) : null}
            <Button variant="secondary" onPress={() => void onShare()}>
              📣 Vora&apos;ya Gel
            </Button>
            <Button variant="outline" onPress={() => void onLeave()} loading={busy}>
              Ayrıl
            </Button>
            {isLeader ? (
              <Button
                variant="danger"
                onPress={() => {
                  void endCityVoiceRoom(roomId).then(() => router.back());
                }}
              >
                Odayı Kapat
              </Button>
            ) : null}
          </View>
        </ScrollView>
      </LiveKitRoom>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: {
    backgroundColor: `${CITY_GOVERNANCE_ACCENT}22`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  liveText: { color: CITY_GOVERNANCE_ACCENT, fontWeight: '700', fontSize: 12 },
  title: { fontWeight: '900', letterSpacing: 0.5 },
  card: { gap: spacing.sm, padding: spacing.lg },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
