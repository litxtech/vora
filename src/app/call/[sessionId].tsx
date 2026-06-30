import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { ActiveCallControls } from '@/features/calls/components/ActiveCallControls';
import { CallActiveHeader } from '@/features/calls/components/CallActiveHeader';
import { CallBackground } from '@/features/calls/components/CallBackground';
import { CallHeroStage } from '@/features/calls/components/CallHeroStage';
import { CallLocalPreview } from '@/features/calls/components/CallLocalPreview';
import { IncomingCallActions } from '@/features/calls/components/IncomingCallActions';
import { IncomingCallStage } from '@/features/calls/components/IncomingCallStage';
import { OutgoingCallActions } from '@/features/calls/components/OutgoingCallActions';
import { RemoteVideoView } from '@/features/calls/components/RemoteVideoView';
import { CALL_DESIGN } from '@/features/calls/constants';
import { useAgoraCall } from '@/features/calls/hooks/useAgoraCall';
import { useCallDuration } from '@/features/calls/hooks/useCallDuration';
import { useCallRingTimeout } from '@/features/calls/hooks/useCallRingTimeout';
import { useCallRingtone } from '@/features/calls/hooks/useCallRingtone';
import {
  acceptCall,
  cancelCall,
  declineCall,
  endCall,
  fetchCallSession,
  markCallMissed,
} from '@/features/calls/services/callService';
import { ensureCallPermissions } from '@/features/calls/services/callPermissions';
import { stopCallRingtone } from '@/features/calls/services/callRingtonePlayer';
import { useCallStore } from '@/features/calls/store/callStore';
import {
  TERMINAL_CALL_STATUSES,
  type CallScreenMode,
  type CallSession,
} from '@/features/calls/types';
import { callErrorMessage, formatCallDuration } from '@/features/calls/utils';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function CallScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const session = useCallStore((s) => s.session);
  const setSession = useCallStore((s) => s.setSession);
  const patchSession = useCallStore((s) => s.patchSession);
  const reset = useCallStore((s) => s.reset);
  const isJoined = useCallStore((s) => s.isJoined);
  const isMuted = useCallStore((s) => s.media.isMuted);
  const isSpeakerOn = useCallStore((s) => s.media.isSpeakerOn);
  const isCameraOn = useCallStore((s) => s.media.isCameraOn);
  const remoteCameraOff = useCallStore((s) => s.media.remoteCameraOff);
  const [loading, setLoading] = useState(true);
  const closingRef = useRef(false);
  const actionInFlightRef = useRef(false);
  const {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    switchCamera,
    remoteUid,
  } = useAgoraCall();

  const mode: CallScreenMode = useMemo(() => {
    if (!session || !user) return 'outgoing';
    if (session.status === 'accepted') return 'active';
    if (session.callee_id === user.id && session.status === 'ringing') return 'incoming';
    return 'outgoing';
  }, [session, user]);

  const peer = useMemo(() => {
    if (!session || !user) return null;
    return user.id === session.caller_id ? session.callee : session.caller;
  }, [session, user]);

  const duration = useCallDuration(session?.started_at ?? null, mode === 'active');

  const minimizeCall = useCallback(() => {
    if (session?.status === 'accepted') {
      useCallStore.getState().setJoined(true);
    }
    router.back();
  }, [session?.status]);

  const closeCallScreen = useCallback(
    async (options?: { leaveMedia?: boolean }) => {
      if (closingRef.current) return;
      closingRef.current = true;

      if (options?.leaveMedia !== false) {
        await leaveChannel();
      }
      await stopCallRingtone();
      reset();
      router.back();
    },
    [leaveChannel, reset],
  );

  const patchSessionRef = useRef(patchSession);
  const closeCallScreenRef = useRef(closeCallScreen);
  patchSessionRef.current = patchSession;
  closeCallScreenRef.current = closeCallScreen;

  useEffect(() => {
    closingRef.current = false;
    actionInFlightRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (mode !== 'active') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      minimizeCall();
      return true;
    });
    return () => sub.remove();
  }, [mode, minimizeCall]);

  useEffect(() => {
    if (!sessionId) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const cached = useCallStore.getState().session;
        if (cached?.id === sessionId && !TERMINAL_CALL_STATUSES.includes(cached.status)) {
          if (!active) return;
          setSession(cached);
          setLoading(false);
          return;
        }

        const data = await fetchCallSession(sessionId);
        if (!active) return;

        if (!data || TERMINAL_CALL_STATUSES.includes(data.status)) {
          closingRef.current = true;
          reset();
          router.back();
          return;
        }

        setSession(data);
      } catch {
        if (!active) return;
        closingRef.current = true;
        reset();
        router.back();
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [reset, sessionId, setSession]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      try {
        const nextChannel = await subscribeSupabaseChannel(
          `call-session-${sessionId}`,
          (ch) =>
            ch.on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'call_sessions',
                filter: `id=eq.${sessionId}`,
              },
              (payload) => {
                const next = payload.new as CallSession;
                patchSessionRef.current(next);

                if (TERMINAL_CALL_STATUSES.includes(next.status)) {
                  void closeCallScreenRef.current();
                }
              },
            ),
        );

        if (cancelled) {
          await supabase.removeChannel(nextChannel);
          return;
        }

        channel = nextChannel;
      } catch {
        // Abonelik başarısız; oturum yüklemesi hâlâ fetch ile çalışır.
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (mode !== 'active' || !session || !user || isJoined || closingRef.current) return;
    if (TERMINAL_CALL_STATUSES.includes(session.status)) return;

    joinChannel({
      channelName: session.channel_name,
      sessionId: session.id,
      userId: user.id,
      callType: session.call_type,
    }).catch((error) => {
      Alert.alert('Arama hatası', String(error));
      void closeCallScreen({ leaveMedia: false });
    });
  }, [closeCallScreen, isJoined, joinChannel, mode, session, user]);

  const handleAccept = async () => {
    if (!session || closingRef.current) return;
    try {
      const permissions = await ensureCallPermissions(session.call_type);
      if (!permissions.granted) {
        Alert.alert('İzin gerekli', permissions.message ?? 'Görüşme için gerekli izinler verilmedi.');
        return;
      }
      const updated = await acceptCall(session.id);
      setSession(updated);
    } catch (error) {
      Alert.alert('Cevaplanamadı', String(error));
    }
  };

  const handleDecline = async () => {
    if (!session || closingRef.current || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    try {
      await declineCall(session.id);
      await closeCallScreen({ leaveMedia: false });
    } catch (error) {
      actionInFlightRef.current = false;
      Alert.alert('Reddedilemedi', callErrorMessage(error, 'Arama reddedilemedi.'));
    }
  };

  const handleCancel = async () => {
    if (!session || closingRef.current || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    try {
      await cancelCall(session.id);
      await closeCallScreen({ leaveMedia: false });
    } catch (error) {
      actionInFlightRef.current = false;
      Alert.alert('İptal edilemedi', callErrorMessage(error, 'Arama iptal edilemedi.'));
    }
  };

  const handleRingTimeout = useCallback(async () => {
    if (!session || closingRef.current || actionInFlightRef.current) return;
    if (session.status !== 'ringing') return;

    actionInFlightRef.current = true;
    try {
      await markCallMissed(session.id);
    } catch {
      // Karşı taraf zaten cevaplamış veya kapattıysa yine de ekrandan çık.
    }
    await closeCallScreen({ leaveMedia: false });
  }, [closeCallScreen, session]);

  useCallRingTimeout({
    sessionId,
    status: session?.status,
    mode,
    enabled: !loading && Boolean(session),
    onTimeout: handleRingTimeout,
  });

  useCallRingtone({
    mode,
    status: session?.status,
    enabled: !loading && Boolean(session),
  });

  const handleEnd = async () => {
    if (!session || closingRef.current) return;
    closingRef.current = true;

    patchSession({
      status: 'ended',
      ended_at: new Date().toISOString(),
    });

    await leaveChannel();
    reset();
    router.back();

    try {
      await endCall(session.id);
    } catch (error) {
      Alert.alert('Görüşme sonlandırılamadı', String(error));
    }
  };

  if (loading || !session) {
    return (
      <CallBackground>
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      </CallBackground>
    );
  }

  const isVideoCall = session.call_type === 'video';
  const isActiveCall = mode === 'active';
  const isActiveVideo = isActiveCall && isVideoCall;
  const remoteConnected = Boolean(remoteUid);
  const pulseColor =
    mode === 'incoming'
      ? CALL_DESIGN.pulse.incomingColor
      : isVideoCall
        ? CALL_DESIGN.pulse.videoColor
        : CALL_DESIGN.pulse.outgoingColor;

  const statusText =
    mode === 'incoming'
      ? isVideoCall
        ? 'Görüntülü arama geliyor…'
        : 'Sesli arama geliyor…'
      : mode === 'outgoing'
        ? isVideoCall
          ? 'Görüntülü aranıyor…'
          : 'Aranıyor…'
        : formatCallDuration(duration);

  return (
    <CallBackground variant={isActiveCall ? 'video' : 'default'}>
      <SafeAreaView style={styles.safe}>
        {mode === 'active' ? (
          <Pressable
            style={styles.minimizeBtn}
            onPress={minimizeCall}
            hitSlop={12}
            accessibilityLabel="Görüşmeyi küçült"
          >
            <Ionicons name="chevron-down" size={26} color="#fff" />
          </Pressable>
        ) : null}

        {isActiveCall ? (
          <>
            <RemoteVideoView
              remoteUid={remoteUid}
              participant={peer}
              isVideoCall={isVideoCall}
              remoteCameraOff={remoteCameraOff}
              remoteConnected={remoteConnected}
            />
            {isActiveVideo && user ? (
              <CallLocalPreview
                userId={user.id}
                visible={isCameraOn}
                onFlipCamera={switchCamera}
              />
            ) : null}
            <CallActiveHeader
              participant={peer}
              timerLabel={statusText}
              isVideoCall={isVideoCall}
              remoteConnected={remoteConnected}
            />
          </>
        ) : mode === 'incoming' ? (
          <View style={styles.incomingHeader}>
            <IncomingCallStage participant={peer} subtitle={statusText} />
          </View>
        ) : (
          <View style={styles.heroRegion}>
            <CallHeroStage
              participant={peer}
              subtitle={statusText}
              pulseActive={false}
              pulseColor={pulseColor}
              compact={mode === 'active'}
            />
          </View>
        )}

        <View style={styles.controls}>
          {mode === 'incoming' ? (
            <IncomingCallActions
              onDecline={handleDecline}
              onAccept={handleAccept}
              video={isVideoCall}
            />
          ) : null}

          {mode === 'outgoing' ? <OutgoingCallActions onCancel={handleCancel} /> : null}

          {mode === 'active' ? (
            <ActiveCallControls
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              isCameraOn={isCameraOn}
              isVideoCall={isVideoCall}
              onToggleMute={toggleMute}
              onToggleSpeaker={toggleSpeaker}
              onToggleCamera={toggleCamera}
              onSwitchCamera={switchCamera}
              onEndCall={handleEnd}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </CallBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  incomingHeader: {
    paddingTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroRegion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  minimizeBtn: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    paddingBottom: 36,
  },
});
