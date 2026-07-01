import { Pressable, StyleSheet } from 'react-native';
import { ProfileTabIcon } from '@/features/profile/components/ProfileTabIcon';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';

const AVATAR_SIZE = 34;

export function FeedHeaderAvatarButton() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const openDrawer = useFeedDrawerStore((s) => s.openDrawer);

  return (
    <Pressable
      onPress={() => {
        if (useFeedDrawerStore.getState().open) return;
        openDrawer();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Menüyü aç"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      {...getAndroidInstantPressableProps()}
    >
      <ProfileTabIcon
        avatarUrl={profile?.avatar_url ?? null}
        username={profile?.username ?? ''}
        color={colors.primary}
        size={AVATAR_SIZE}
        focused={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexShrink: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.94 }] },
});
