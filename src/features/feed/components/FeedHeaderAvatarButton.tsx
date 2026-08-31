import { Pressable, StyleSheet } from 'react-native';
import { FeedHeaderAvatarRing } from '@/features/feed/components/FeedHeaderAvatarRing';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedDrawerStore } from '@/features/feed/store/feedDrawerStore';
import { getAndroidInstantPressableProps } from '@/lib/device/androidPerfProfile';

export function FeedHeaderAvatarButton() {
  const { profile } = useAuth();
  const drawerOpen = useFeedDrawerStore((s) => s.open);
  const openDrawer = useFeedDrawerStore((s) => s.openDrawer);
  const closeDrawer = useFeedDrawerStore((s) => s.closeDrawer);

  return (
    <Pressable
      onPress={() => {
        if (drawerOpen) {
          closeDrawer();
          return;
        }
        openDrawer();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={drawerOpen ? 'Menüyü kapat' : 'Menüyü aç'}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      {...getAndroidInstantPressableProps()}
    >
      <FeedHeaderAvatarRing
        avatarUrl={profile?.avatar_url ?? null}
        username={profile?.username ?? ''}
        active={drawerOpen}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexShrink: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.94 }] },
});
