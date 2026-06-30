import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { ProfileTabBarIcon } from '@/features/profile/components/ProfileTabBarIcon';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';

/** Profil sekmesi — hesap geçişi profil ekranındaki AccountSwitchBar üzerinden yapılır. */
export function ProfileTabButton({
  style,
  accessibilityState,
  onPress,
  ...rest
}: BottomTabBarButtonProps) {
  const { tabBar } = useTheme();
  const focused = accessibilityState?.selected ?? false;
  const color = focused ? tabBar.activeTint : tabBar.inactiveTint;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={style as StyleProp<ViewStyle>}
      hitSlop={8}
      {...getAndroidInstantPressableProps()}
    >
      <ProfileTabBarIcon color={color} focused={focused} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          color,
        }}
      >
        Profil
      </Text>
    </Pressable>
  );
}
