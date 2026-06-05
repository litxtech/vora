import { StyleSheet, View } from 'react-native';
import { CallControlButton } from './CallControlButton';

type OutgoingCallActionsProps = {
  onCancel: () => void;
};

export function OutgoingCallActions({ onCancel }: OutgoingCallActionsProps) {
  return (
    <View style={styles.row}>
      <CallControlButton icon="call" label="İptal" onPress={onCancel} danger size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
  },
});
