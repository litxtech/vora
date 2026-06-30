import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CallControlButton } from './CallControlButton';
import { CallGlassBar } from './CallGlassBar';

type OutgoingCallActionsProps = {
  onCancel: () => void;
};

export function OutgoingCallActions({ onCancel }: OutgoingCallActionsProps) {
  return (
    <Animated.View entering={FadeInUp.delay(160).duration(400).springify()}>
      <CallGlassBar animate={false}>
        <View style={styles.row}>
          <CallControlButton icon="call" label="İptal" onPress={onCancel} danger size="lg" />
        </View>
      </CallGlassBar>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
  },
});
