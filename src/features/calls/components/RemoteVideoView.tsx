import { StyleSheet, View } from 'react-native';
import { RtcSurfaceView } from 'react-native-agora';
import { CallAvatar } from './CallAvatar';
import type { CallParticipant } from '../types';

type RemoteVideoViewProps = {
  remoteUid: number | null;
  participant?: CallParticipant | null;
  isVideoCall: boolean;
  isCameraOn: boolean;
};

export function RemoteVideoView({
  remoteUid,
  participant,
  isVideoCall,
  isCameraOn,
}: RemoteVideoViewProps) {
  if (isVideoCall && remoteUid) {
    return (
      <View style={styles.videoContainer}>
        <RtcSurfaceView
          style={styles.remoteVideo}
          canvas={{ uid: remoteUid }}
        />
      </View>
    );
  }

  return (
    <View style={styles.avatarStage}>
      <CallAvatar
        participant={participant}
        size={148}
        showName={false}
      />
      {isVideoCall && !isCameraOn ? (
        <View style={styles.cameraOffBadge}>
          <CallAvatar participant={participant} size={72} showName={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  avatarStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  cameraOffBadge: {
    position: 'absolute',
    bottom: 180,
    right: 24,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
