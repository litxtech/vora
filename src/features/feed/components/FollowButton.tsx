import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { toggleFollow } from '@/features/feed/services/engagement';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type FollowButtonProps = {
  authorId: string;
  isFollowing: boolean;
  onToggle: (next: boolean) => void;
};

export function FollowButton({ authorId, isFollowing, onToggle }: FollowButtonProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  if (!user || user.id === authorId || authorId.startsWith('demo-')) return null;

  const handlePress = async () => {
    if (!requireAuth('Takip')) return;

    const next = !isFollowing;
    onToggle(next);

    const { error } = await toggleFollow(authorId, user.id, isFollowing);
    if (error) onToggle(isFollowing);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.btn,
        {
          borderColor: isFollowing ? colors.border : colors.primary,
          backgroundColor: isFollowing ? 'transparent' : 'rgba(30,136,229,0.12)',
        },
      ]}
    >
      <Text variant="caption" style={{ color: isFollowing ? colors.textSecondary : colors.primary }}>
        {isFollowing ? 'Takip ediliyor' : 'Takip et'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
