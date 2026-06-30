import { StyleSheet, View } from 'react-native';
import { CallControlButton } from './CallControlButton';

type IncomingCallActionsProps = {
  onDecline: () => void;
  onAccept: () => void;
  video?: boolean;
};

export function IncomingCallActions({ onDecline, onAccept, video = false }: IncomingCallActionsProps) {
  return (
    <View style={styles.row}>
      <CallControlButton icon="close" label="Reddet" onPress={onDecline} danger size="lg" />
      <CallControlButton
        icon={video ? 'videocam' : 'call'}
        label="Cevapla"
        onPress={onAccept}
        success
        size="lg"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 32,
  },
});
