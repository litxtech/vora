import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type NewPostsBannerProps = {
  onRefresh: () => void;
};

export function NewPostsBanner({ onRefresh }: NewPostsBannerProps) {
  const { colors } = useTheme();
  const count = useFeedStore((s) => s.newPostsCount);
  const resetNewPosts = useFeedStore((s) => s.resetNewPosts);

  if (count <= 0) return null;

  return (
    <Pressable
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        },
      ]}
      onPress={() => {
        resetNewPosts();
        onRefresh();
      }}
    >
      <Ionicons name="arrow-up-circle" size={18} color="#fff" />
      <Text variant="caption" style={styles.bannerText}>
        {count} yeni gönderi — yenile
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerText: { color: '#fff', fontWeight: '700' },
});
