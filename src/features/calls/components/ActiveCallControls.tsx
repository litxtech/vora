import { StyleSheet, View } from 'react-native';
import { CallControlButton } from './CallControlButton';
import { CallGlassBar } from './CallGlassBar';

type ActiveCallControlsProps = {
  isMuted: boolean;
  isSpeakerOn: boolean;
  isCameraOn: boolean;
  isVideoCall: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
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
  onSwitchCamera,
  onEndCall,
}: ActiveCallControlsProps) {
  return (
    <CallGlassBar>
      <View style={styles.stack}>
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
          <CallControlButton icon="call" label="Bitir" onPress={onEndCall} danger size="lg" />
          {isVideoCall ? (
            <>
              <CallControlButton
                icon={isCameraOn ? 'videocam' : 'videocam-off'}
                label={isCameraOn ? 'Kamera' : 'Kapalı'}
                onPress={onToggleCamera}
                active={!isCameraOn}
              />
              <CallControlButton
                icon="camera-reverse"
                label="Çevir"
                onPress={onSwitchCamera}
              />
            </>
          ) : null}
        </View>
      </View>
    </CallGlassBar>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    rowGap: 10,
    width: '100%',
  },
});
