import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function CentersTabButton({
  onPress,
  style,
  accessibilityState,
  ...rest
}: BottomTabBarButtonProps) {
  const { colors, isDark } = useTheme();
  const showCenters = useFeatureVisible('centers-hub');

  if (!showCenters) return null;

  const handlePress: BottomTabBarButtonProps['onPress'] = (event) => {
    if (Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.(event);
  };

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={handlePress}
      style={[style as StyleProp<ViewStyle>, styles.slot]}
      hitSlop={8}
      {...getAndroidInstantPressableProps()}
    >
      <View
        style={[
          styles.outerRing,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.35)' : colors.border,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surfaceElevated,
          },
        ]}
      >
        <View style={[styles.inner, { backgroundColor: colors.accent }]}>
          <Ionicons name="grid" size={22} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 48,
    height: 48,
    marginTop: -6,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
