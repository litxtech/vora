import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { CallParticipant } from '@/features/calls/types';
import { displayName } from '@/features/calls/utils';

type CallActiveHeaderProps = {
  participant?: CallParticipant | null;
  timerLabel: string;
  isVideoCall: boolean;
  remoteConnected: boolean;
};

/** Aktif görüşme üst bilgi bandı — isim, süre, bağlantı durumu. */
export function CallActiveHeader({
  participant,
  timerLabel,
  isVideoCall,
  remoteConnected,
}: CallActiveHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(340)} style={styles.wrap} pointerEvents="none">
      <View style={styles.pill}>
        {isVideoCall ? (
          <Ionicons
            name={remoteConnected ? 'videocam' : 'videocam-outline'}
            size={14}
            color="rgba(255,255,255,0.85)"
          />
        ) : (
          <Ionicons name="call" size={13} color="rgba(255,255,255,0.85)" />
        )}
        <Text style={styles.name} numberOfLines={1}>
          {displayName(participant)}
        </Text>
        <View style={styles.dot} />
        <Text style={styles.timer}>{timerLabel}</Text>
      </View>
      {!remoteConnected ? <Text style={styles.hint}>Bağlanıyor…</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: '88%',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  timer: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
});
