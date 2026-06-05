import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

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
  const dimension = size === 'lg' ? 76 : 64;

  const backgroundColor = danger
    ? '#FF3B30'
    : success
      ? '#34C759'
      : active
        ? 'rgba(255,255,255,0.92)'
        : 'rgba(255,255,255,0.14)';

  const iconColor = danger || success ? '#FFFFFF' : active ? '#0A0E14' : '#FFFFFF';

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={size === 'lg' ? 34 : 28} color={iconColor} />
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 10,
    minWidth: 84,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
