import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '@/constants/theme';

type PostMusicSoundToggleProps = {
  enabled: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PostMusicSoundToggle({ enabled, onToggle, style }: PostMusicSoundToggleProps) {
  return (
    <Pressable
      style={[styles.btn, style]}
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={enabled ? 'Müziği kapat' : 'Müziği aç'}
    >
      <Ionicons name={enabled ? 'volume-high' : 'volume-mute'} size={18} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
