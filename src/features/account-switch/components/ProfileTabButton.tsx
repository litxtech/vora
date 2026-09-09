import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Text, type StyleProp, type ViewStyle } from 'react-native';
import { HoldToSwitchTabButton } from '@/features/navigation/components/HoldToSwitchTabButton';
import { ProfileTabBarIcon } from '@/features/profile/components/ProfileTabBarIcon';
import { useTheme } from '@/providers/ThemeProvider';

/** Profil sekmesi — hesap geçişi profil ekranındaki AccountSwitchBar üzerinden yapılır. */
export function ProfileTabButton({
  style,
  accessibilityState,
  children: _children,
  ...rest
}: BottomTabBarButtonProps) {
  const { tabBar } = useTheme();
  const focused = accessibilityState?.selected ?? false;
  const color = focused ? tabBar.activeTint : tabBar.inactiveTint;

  return (
    <HoldToSwitchTabButton
      {...rest}
      accessibilityState={accessibilityState}
      style={style as StyleProp<ViewStyle>}
      hitSlop={8}
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
    </HoldToSwitchTabButton>
  );
}
