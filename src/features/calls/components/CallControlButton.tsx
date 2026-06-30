import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CALL_DESIGN } from '@/features/calls/constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CallControlButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  success?: boolean;
  size?: 'md' | 'lg';
};

export function CallControlButton({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
  success = false,
  size = 'md',
}: CallControlButtonProps) {
  const dimension = size === 'lg' ? CALL_DESIGN.controlLg : CALL_DESIGN.controlMd;
  const scale = useSharedValue(1);

  const backgroundColor = danger
    ? '#FF3B30'
    : success
      ? '#34C759'
      : active
        ? 'rgba(255,255,255,0.94)'
        : 'rgba(255,255,255,0.14)';

  const iconColor = danger || success ? '#FFFFFF' : active ? '#0A0E14' : '#FFFFFF';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 16, stiffness: 380 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        }}
        style={[
          styles.button,
          animatedStyle,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor,
          },
          !danger && !success && !active ? styles.glass : null,
        ]}
      >
        <Ionicons name={icon} size={size === 'lg' ? 32 : 26} color={iconColor} />
      </AnimatedPressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 10,
    minWidth: 76,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
