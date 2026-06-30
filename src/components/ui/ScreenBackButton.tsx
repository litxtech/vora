import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type ScreenBackButtonProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ScreenBackButton({ onPress, style }: ScreenBackButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.back, style]}
      onPress={onPress ?? (() => router.back())}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      {...getAndroidInstantPressableProps()}
    >
      <Ionicons name="arrow-back" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
