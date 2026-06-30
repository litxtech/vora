import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { toggleAuthorFollow } from '@/features/feed/services/engagement';
import { isFollowingBusiness } from '@/features/profile/services/businessFollow';
import { supabase } from '@/lib/supabase/client';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type FollowButtonProps = {
  authorId: string;
  /** Kurumsal hesaplarda işletme takibi de senkronize edilir. */
  businessId?: string | null;
  username?: string;
  isFollowing: boolean;
  onToggle: (next: boolean) => void;
  /** Akış / reels gibi satır içi bağlamlarda takip edilen kullanıcıda gizle */
  hideWhenFollowing?: boolean;
};

export function FollowButton({
  authorId,
  businessId,
  username,
  isFollowing,
  onToggle,
  hideWhenFollowing = false,
}: FollowButtonProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [busy, setBusy] = useState(false);
  const toggleInFlightRef = useRef(false);

  const performToggle = useCallback(async () => {
    if (!user || toggleInFlightRef.current) return;

    toggleInFlightRef.current = true;
    const next = !isFollowing;
    onToggle(next);
    setBusy(true);

    try {
      const { error } = await toggleAuthorFollow(authorId, user.id, isFollowing, businessId);
      if (error) {
        onToggle(isFollowing);
        Alert.alert('Takip edilemedi', error);
        return;
      }

      let resolved = false;
      if (businessId) {
        resolved = await isFollowingBusiness(user.id, businessId);
      } else {
        const { data: followRow } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', authorId)
          .maybeSingle();
        resolved = !!followRow;
      }

      onToggle(resolved);
    } finally {
      toggleInFlightRef.current = false;
      setBusy(false);
    }
  }, [authorId, businessId, isFollowing, onToggle, user]);

  if (!user || user.id === authorId || authorId.startsWith('demo-')) return null;
  if (hideWhenFollowing && isFollowing) return null;

  const handlePress = async () => {
    if (!(await requireAuth('Takip'))) return;

    if (isFollowing) {
      const target = username ? `@${username}` : 'Bu kullanıcıyı';
      Alert.alert('Takipten çık', `${target} takipten çıkmak istiyor musun?`, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Takipten çık', style: 'destructive', onPress: () => void performToggle() },
      ]);
      return;
    }

    void performToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      hitSlop={6}
      style={[
        styles.btn,
        busy && styles.busy,
        {
          borderColor: isFollowing ? colors.border : colors.primary,
          backgroundColor: isFollowing ? colors.surface : `${colors.primary}18`,
        },
      ]}
    >
      <Text
        variant="caption"
        style={{
          color: isFollowing ? colors.textSecondary : colors.primary,
          fontWeight: '600',
        }}
      >
        {isFollowing ? 'Takiptesin' : 'Takip et'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  busy: { opacity: 0.6 },
});
