import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RtcSurfaceView } from 'react-native-agora';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/providers/AuthProvider';
import { ActiveCallControls } from '@/features/calls/components/ActiveCallControls';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import { CallBackground } from '@/features/calls/components/CallBackground';
import { IncomingCallActions } from '@/features/calls/components/IncomingCallActions';
import { OutgoingCallActions } from '@/features/calls/components/OutgoingCallActions';
import { RemoteVideoView } from '@/features/calls/components/RemoteVideoView';
import { useAgoraCall } from '@/features/calls/hooks/useAgoraCall';
import { useCallDuration } from '@/features/calls/hooks/useCallDuration';
import {
  acceptCall,
  cancelCall,
  declineCall,
  endCall,
  fetchCallSession,
} from '@/features/calls/services/callService';
import { useCallStore } from '@/features/calls/store/callStore';
import type { CallScreenMode, CallSession } from '@/features/calls/types';
import { displayName, formatCallDuration, uidFromUserId } from '@/features/calls/utils';
import { supabase } from '@/lib/supabase/client';

export default function CallScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { session, setSession, patchSession, media, reset, isJoined } = useCallStore();
  const [loading, setLoading] = useState(true);
  const {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
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

  useEffect(() => {
    if (!sessionId) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      const data = await fetchCallSession(sessionId);
      if (!active) return;
      setSession(data);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`call-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const next = payload.new as CallSession;
          patchSession(next);

          if (['declined', 'ended', 'cancelled', 'missed'].includes(next.status)) {
            leaveChannel().finally(() => {
              reset();
              router.back();
            });
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [leaveChannel, patchSession, reset, sessionId, setSession]);

  useEffect(() => {
    if (mode !== 'active' || !session || !user || isJoined) return;

    joinChannel({
      channelName: session.channel_name,
      userId: user.id,
      callType: session.call_type,
    }).catch((error) => {
      Alert.alert('Arama hatası', String(error));
      router.back();
    });
  }, [isJoined, joinChannel, mode, session, user]);

  const handleAccept = async () => {
    if (!session) return;
    try {
      const updated = await acceptCall(session.id);
      setSession(updated);
    } catch (error) {
      Alert.alert('Cevaplanamadı', String(error));
    }
  };

  const handleDecline = async () => {
    if (!session) return;
    await declineCall(session.id);
    reset();
    router.back();
  };

  const handleCancel = async () => {
    if (!session) return;
    await cancelCall(session.id);
    reset();
    router.back();
  };

  const handleEnd = async () => {
    if (!session) return;
    await endCall(session.id);
    await leaveChannel();
    reset();
    router.back();
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

  const statusText =
    mode === 'incoming'
      ? session.call_type === 'video'
        ? 'Görüntülü arama geliyor...'
        : 'Sesli arama geliyor...'
      : mode === 'outgoing'
        ? 'Aranıyor...'
        : formatCallDuration(duration);

  return (
    <CallBackground>
      <SafeAreaView style={styles.safe}>
        {mode === 'active' && session.call_type === 'video' ? (
          <>
            <RemoteVideoView
              remoteUid={remoteUid}
              participant={peer}
              isVideoCall
              isCameraOn={media.isCameraOn}
            />
            {media.isCameraOn && user ? (
              <View style={styles.localPreview}>
                <RtcSurfaceView
                  style={styles.localVideo}
                  canvas={{ uid: uidFromUserId(user.id) }}
                />
              </View>
            ) : null}
            <View style={styles.activeHeader}>
              <Text style={styles.activeName}>{displayName(peer)}</Text>
              <Text style={styles.activeTimer}>{statusText}</Text>
            </View>
          </>
        ) : (
          <View style={styles.hero}>
            <CallAvatar participant={peer} subtitle={statusText} />
          </View>
        )}

        <View style={styles.controls}>
          {mode === 'incoming' ? (
            <IncomingCallActions
              onDecline={handleDecline}
              onAccept={handleAccept}
              video={session.call_type === 'video'}
            />
          ) : null}

          {mode === 'outgoing' ? <OutgoingCallActions onCancel={handleCancel} /> : null}

          {mode === 'active' ? (
            <ActiveCallControls
              isMuted={media.isMuted}
              isSpeakerOn={media.isSpeakerOn}
              isCameraOn={media.isCameraOn}
              isVideoCall={session.call_type === 'video'}
              onToggleMute={toggleMute}
              onToggleSpeaker={toggleSpeaker}
              onToggleCamera={toggleCamera}
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
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
  },
  controls: {
    paddingBottom: 42,
    paddingHorizontal: 20,
  },
  activeHeader: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  activeName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  activeTimer: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
  },
  localPreview: {
    position: 'absolute',
    top: 110,
    right: 20,
    width: 108,
    height: 156,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#111827',
  },
  localVideo: {
    flex: 1,
  },
});
