import { StyleSheet, View } from 'react-native';
import { CallControlButton } from './CallControlButton';

type ActiveCallControlsProps = {
  isMuted: boolean;
  isSpeakerOn: boolean;
  isCameraOn: boolean;
  isVideoCall: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
};

export function ActiveCallControls({
  isMuted,
  isSpeakerOn,
  isCameraOn,
  isVideoCall,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onEndCall,
}: ActiveCallControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <CallControlButton
          icon={isMuted ? 'mic-off' : 'mic'}
          label={isMuted ? 'Sessiz' : 'Mikrofon'}
          onPress={onToggleMute}
          active={isMuted}
        />
        <CallControlButton
          icon={isSpeakerOn ? 'volume-high' : 'ear'}
          label={isSpeakerOn ? 'Hoparlör' : 'Ahize'}
          onPress={onToggleSpeaker}
          active={isSpeakerOn}
        />
        {isVideoCall ? (
          <CallControlButton
            icon={isCameraOn ? 'videocam' : 'videocam-off'}
            label={isCameraOn ? 'Kamera' : 'Kapalı'}
            onPress={onToggleCamera}
            active={!isCameraOn}
          />
        ) : null}
      </View>

      <View style={styles.endRow}>
        <CallControlButton icon="call" label="Kapat" onPress={onEndCall} danger size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 28,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  endRow: {
    alignItems: 'center',
  },
});
