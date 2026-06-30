import { StyleSheet, Text as RNText, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CallRtcView } from '@/features/calls/components/CallRtcView';
import { CALL_DESIGN } from '@/features/calls/constants';
import { buildRemoteVideoCanvas } from '@/features/calls/services/callVideoCanvas';
import type { CallParticipant } from '../types';
import { displayName as callParticipantName } from '../utils';
import { CallAvatar } from './CallAvatar';

type RemoteVideoViewProps = {
  remoteUid: number | null;
  participant?: CallParticipant | null;
  isVideoCall: boolean;
  remoteCameraOff?: boolean;
  remoteConnected?: boolean;
};

export function RemoteVideoView({
  remoteUid,
  participant,
  isVideoCall,
  remoteCameraOff = false,
  remoteConnected = false,
}: RemoteVideoViewProps) {
  if (isVideoCall && remoteUid) {
    return (
      <Animated.View entering={FadeIn.duration(420)} style={videoStyles.videoContainer}>
        <CallRtcView style={videoStyles.remoteVideo} canvas={buildRemoteVideoCanvas(remoteUid)} />
        <LinearGradient
          colors={[...CALL_DESIGN.gradients.videoTopFade]}
          style={videoStyles.topFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...CALL_DESIGN.gradients.videoBottomFade]}
          style={videoStyles.bottomFade}
          pointerEvents="none"
        />
        {!remoteCameraOff ? null : (
          <View style={videoStyles.cameraOffOverlay} pointerEvents="none">
            <CallAvatar participant={participant} size={96} showName={false} />
            <RNText style={videoStyles.cameraOffText}>{callParticipantName(participant)}</RNText>
            <RNText style={videoStyles.cameraOffHint}>Kamera kapalı</RNText>
          </View>
        )}
      </Animated.View>
    );
  }

  const waitingHint = isVideoCall
    ? 'Görüntü bekleniyor…'
    : remoteConnected
      ? null
      : 'Bağlanıyor…';
  const showWaitingName = isVideoCall || !remoteConnected;

  return (
    <View style={videoStyles.waitingStage}>
      <CallAvatar participant={participant} size={128} showName={false} glow />
      {showWaitingName ? (
        <RNText style={videoStyles.waitingName}>{callParticipantName(participant)}</RNText>
      ) : null}
      {waitingHint ? <RNText style={videoStyles.waitingHint}>{waitingHint}</RNText> : null}
    </View>
  );
}

const videoStyles = StyleSheet.create({
  videoContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: CALL_DESIGN.videoBg,
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  cameraOffOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  cameraOffText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  cameraOffHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '500',
  },
  waitingStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 120,
  },
  waitingName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  waitingHint: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    fontWeight: '500',
  },
});
