import { Platform, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

const TAB_ICON_SIZE = 28;

export function CreateTabButton({
  style,
  accessibilityState,
  ...rest
}: BottomTabBarButtonProps) {
  const { tabBar } = useTheme();
  const { requireAuth } = useRequireAuth();
  const showCreate = useFeatureVisible('compose');

  if (!showCreate) return null;

  const focused = accessibilityState?.selected ?? false;
  const color = focused ? tabBar.activeTint : tabBar.inactiveTint;

  const handlePress = async () => {
    if (!(await requireAuth('Paylaşım'))) return;
    if (Platform.OS !== 'android') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/capture' as Href);
  };

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={handlePress}
      style={style as StyleProp<ViewStyle>}
      hitSlop={8}
      {...getAndroidInstantPressableProps()}
    >
      <Ionicons name="camera-outline" size={TAB_ICON_SIZE} color={color} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          color,
        }}
      >
        Paylaş
      </Text>
    </Pressable>
  );
}
