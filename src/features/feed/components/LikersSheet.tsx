import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { fetchPostLikers, fetchReelLikers } from '@/features/feed/services/likers';
import type { LikeUser } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type LikersSheetProps = {
  visible: boolean;
  targetType: 'post' | 'reel';
  targetId: string;
  likeCount: number;
  onClose: () => void;
};

export function LikersSheet({ visible, targetType, targetId, likeCount, onClose }: LikersSheetProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [likers, setLikers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const fetch = targetType === 'post' ? fetchPostLikers : fetchReelLikers;
    const list = await fetch(targetId, user?.id ?? null);
    setLikers(list);
    setLoading(false);
  }, [targetId, targetType, user?.id]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  const openProfile = (userId: string) => {
    onClose();
    router.push(`/user/${userId}` as never);
  };

  const renderLiker = ({ item }: { item: LikeUser }) => (
    <Pressable
      style={[styles.row, { borderColor: colors.border }]}
      onPress={() => openProfile(item.id)}
    >
      <ProfileAvatar username={item.username} avatarUrl={item.avatarUrl} size={44} />
      <View style={styles.meta}>
        <Text variant="label" numberOfLines={1}>
          {item.fullName ?? item.username}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      {user && user.id !== item.id ? (
        <FollowButton
          authorId={item.id}
          username={item.username}
          isFollowing={item.isFollowing}
          onToggle={(next) =>
            setLikers((prev) =>
              prev.map((liker) => (liker.id === item.id ? { ...liker, isFollowing: next } : liker)),
            )
          }
        />
      ) : null}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="h3">Beğenenler</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : likers.length === 0 ? (
            <Text secondary style={styles.empty}>
              {likeCount > 0 ? 'Liste yüklenemedi.' : 'Henüz beğeni yok.'}
            </Text>
          ) : (
            <FlatList
              data={likers}
              keyExtractor={(item) => item.id}
              renderItem={renderLiker}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  list: {
    maxHeight: 420,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  loader: {
    paddingVertical: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
