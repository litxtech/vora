import { useCallback, useEffect, useRef, useState } from 'react';
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
  canPublishVoiceRole,
  endCityVoiceRoom,
  fetchCityVoiceRoom,
  fetchLiveKitToken,
  fetchRoomParticipants,
  fetchSpeakerRequests,
  joinCityVoiceRoom,
  leaveCityVoiceRoom,
  rejectSpeaker,
  requestSpeaker,
  roomSharePath,
  type CityVoiceParticipant,
  type CityVoiceRoom,
} from '@/features/city-voice/services/voiceRoomService';
import { regionNameById } from '@/constants/regions';
import { APP_SHARE_BASE_URL } from '@/constants/app';
import { spacing } from '@/constants/theme';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useTheme } from '@/providers/ThemeProvider';

let globalsRegistered = false;

const SPEAKER_ROLES = new Set(['speaker', 'city_leader', 'council_member', 'moderator', 'admin']);

type SpeakerRequestRow = {
  user_id: string;
  profiles:
    | { username: string; full_name: string | null }
    | { username: string; full_name: string | null }[];
};

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
  const [speakerRequests, setSpeakerRequests] = useState<SpeakerRequestRow[]>([]);
  const [tokenBundle, setTokenBundle] = useState<{ token: string; url: string; canPublish: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [seatRequested, setSeatRequested] = useState(false);
  const lastPublishRef = useRef(false);

  const refreshToken = useCallback(async () => {
    const tk = await fetchLiveKitToken(roomId);
    const canPublish = Boolean(tk.canPublish);
    setTokenBundle({ token: tk.token, url: tk.url, canPublish });
    lastPublishRef.current = canPublish;
  }, [roomId]);

  const reloadLists = useCallback(async () => {
    const [nextParticipants, nextRequests] = await Promise.all([
      fetchRoomParticipants(roomId),
      fetchSpeakerRequests(roomId),
    ]);
    setParticipants(nextParticipants);
    setSpeakerRequests(nextRequests);
    if (user?.id) {
      const minePending = nextRequests.some((r) => r.user_id === user.id);
      setSeatRequested(minePending);
      const me = nextParticipants.find((p) => p.userId === user.id);
      const shouldPublish = canPublishVoiceRole(me?.role);
      if (shouldPublish !== lastPublishRef.current) {
        await refreshToken();
      }
    }
  }, [refreshToken, roomId, user?.id]);

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
      await reloadLists();
      await refreshToken();
    } catch (err) {
      Alert.alert('Oda', err instanceof Error ? err.message : 'Oda açılamadı');
    } finally {
      setLoading(false);
    }
  }, [refreshToken, reloadLists, roomId]);

  useEffect(() => {
    void reload();
    return () => {
      void leaveCityVoiceRoom(roomId).catch(() => undefined);
    };
  }, [reload, roomId]);

  useEffect(() => {
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribeSupabaseChannel>> | null = null;

    const subscribe = async () => {
      try {
        channel = await subscribeSupabaseChannel(`city-voice-${roomId}`, (ch) =>
          ch
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'city_voice_speaker_requests',
                filter: `room_id=eq.${roomId}`,
              },
              () => {
                void reloadLists();
              },
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'city_voice_room_participants',
                filter: `room_id=eq.${roomId}`,
              },
              () => {
                void reloadLists();
              },
            ),
        );
        if (cancelled && channel) {
          await supabase.removeChannel(channel);
        }
      } catch {
        // Realtime yoksa manuel yenileme yeterli
      }
    };

    void subscribe();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [reloadLists, roomId]);

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

  const onRequestSeat = async () => {
    setBusy(true);
    try {
      await requestSpeaker(roomId);
      setSeatRequested(true);
      Alert.alert('Koltuk talebi', 'Lider onaylarsa koltuğa oturup konuşabilirsin.');
      await reloadLists();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Talep gönderilemedi');
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

  const seated = participants.filter((p) => SPEAKER_ROLES.has(p.role));
  const audience = participants.filter((p) => !SPEAKER_ROLES.has(p.role));
  const myParticipant = participants.find((p) => p.userId === user?.id);
  const isLeader = myParticipant?.role === 'city_leader';
  const iAmSeated = canPublishVoiceRole(myParticipant?.role);
  const canPublish = tokenBundle.canPublish && iAmSeated;

  const emptySeatSlots = Math.max(0, 6 - seated.length);

  return (
    <GradientBackground>
      <LiveKitRoom
        key={`${tokenBundle.token}:${canPublish ? 'pub' : 'sub'}`}
        serverUrl={tokenBundle.url}
        token={tokenBundle.token}
        connect
        audio={canPublish}
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
          <Text secondary>
            Odaya dinleyici olarak girersin. Konuşmak için koltuk talep et; lider kabul ederse mikrofon açılır.
          </Text>

          <GlassCard style={styles.card}>
            <Text variant="label">KOLTUKLAR</Text>
            <View style={styles.seatGrid}>
              {seated.map((m) => (
                <View
                  key={m.id}
                  style={[styles.seat, { borderColor: CITY_GOVERNANCE_ACCENT, backgroundColor: `${CITY_GOVERNANCE_ACCENT}18` }]}
                >
                  <Text style={styles.seatEmoji}>{m.role === 'city_leader' ? '👑' : '🎙️'}</Text>
                  <Text numberOfLines={1} style={styles.seatName}>
                    {m.fullName ?? m.username}
                  </Text>
                </View>
              ))}
              {Array.from({ length: emptySeatSlots }).map((_, index) => (
                <View
                  key={`empty-${index}`}
                  style={[styles.seat, styles.emptySeat, { borderColor: colors.border }]}
                >
                  <Text secondary style={styles.seatEmoji}>○</Text>
                  <Text secondary numberOfLines={1} style={styles.seatName}>Boş</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {room.regionIds.map((regionId) => {
            const regionAudience = audience.filter((p) => p.regionId === regionId);
            if (regionAudience.length === 0) return null;
            return (
              <GlassCard key={regionId} style={styles.card}>
                <Text variant="label">
                  DİNLEYİCİLER · {(regionNameById(regionId) ?? regionId).toUpperCase()}
                </Text>
                {regionAudience.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
                    <Text>○ {m.fullName ?? m.username}</Text>
                  </View>
                ))}
              </GlassCard>
            );
          })}

          {isLeader && speakerRequests.length > 0 ? (
            <GlassCard style={styles.card}>
              <Text variant="label">KOLTUK TALEPLERİ</Text>
              {speakerRequests.map((req) => {
                const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
                return (
                  <View key={req.user_id} style={styles.memberRow}>
                    <Text style={{ flex: 1 }}>{profile?.full_name ?? profile?.username}</Text>
                    <Button
                      title="Kabul"
                      size="compact"
                      fullWidth={false}
                      onPress={() => {
                        void approveSpeaker(roomId, req.user_id).then(() => reloadLists());
                      }}
                    />
                    <Button
                      title="Red"
                      size="compact"
                      variant="outline"
                      fullWidth={false}
                      onPress={() => {
                        void rejectSpeaker(roomId, req.user_id).then(() => reloadLists());
                      }}
                    />
                  </View>
                );
              })}
            </GlassCard>
          ) : null}

          <View style={styles.actions}>
            {!iAmSeated ? (
              <Button
                title={seatRequested ? 'Koltuk talebi bekleniyor…' : '🪑 Koltuk Talep Et'}
                variant="outline"
                onPress={() => void onRequestSeat()}
                loading={busy}
                disabled={seatRequested}
              />
            ) : (
              <Text secondary style={styles.seatedHint}>
                Koltuktasın — mikrofonun açık, konuşabilirsin.
              </Text>
            )}
            <Button title="📣 Vora'ya Gel" variant="secondary" onPress={() => void onShare()} />
            <Button title="Ayrıl" variant="outline" onPress={() => void onLeave()} loading={busy} />
            {isLeader ? (
              <Button
                title="Odayı Kapat"
                variant="danger"
                onPress={() => {
                  void endCityVoiceRoom(roomId).then(() => router.back());
                }}
              />
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
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  seat: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  emptySeat: {
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  seatEmoji: { fontSize: 22 },
  seatName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  seatedHint: { textAlign: 'center', marginBottom: spacing.xs },
});
