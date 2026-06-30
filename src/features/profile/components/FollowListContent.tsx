import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { fetchFollowList } from '@/features/profile/services/profileData';
import { removeFollower } from '@/features/profile/services/friendship';
import type { FollowUser } from '@/features/profile/types';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type FollowListContentProps = {
  userId: string;
  type: 'followers' | 'following';
};

export function FollowListContent({ userId, type }: FollowListContentProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchFollowList(userId, type, user?.id ?? null, search);
    setUsers(list);
    setLoading(false);
  }, [userId, type, user?.id, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const canRemoveFollowers = type === 'followers' && !!user?.id && user.id === userId;

  const handleRemoveFollower = useCallback((target: FollowUser) => {
    Alert.alert(
      'Takipçiyi kaldır',
      `@${target.username} kullanıcısı seni takip etmeyi bırakacak. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(target.id);
            const { error } = await removeFollower(target.id);
            setRemovingId(null);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            setUsers((prev) => prev.filter((item) => item.id !== target.id));
          },
        },
      ],
    );
  }, []);

  const title = type === 'followers' ? 'Takipçiler' : 'Takip Edilenler';

  return (
    <View style={styles.container}>
      <AuthHeader title={title} showBack compact />

      <TextInput
        style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        placeholder="Ara..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : users.length === 0 ? (
        <Text secondary style={styles.empty}>
          {search ? 'Sonuç bulunamadı.' : 'Henüz kimse yok.'}
        </Text>
      ) : (
        users.map((u) => (
          <Pressable
            key={u.id}
            style={[styles.row, { borderColor: colors.border }]}
            onPress={() => router.push(`/user/${u.id}` as never)}
          >
            <ProfileAvatar username={u.username} avatarUrl={u.avatarUrl} size={44} />
            <View style={styles.meta}>
              <Text variant="label" numberOfLines={1}>
                {u.fullName ?? u.username}
              </Text>
              <Text secondary variant="caption" numberOfLines={1}>
                @{u.username}
              </Text>
            </View>
            {canRemoveFollowers ? (
              <Pressable
                style={[styles.removeBtn, { borderColor: colors.border }]}
                disabled={removingId === u.id}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleRemoveFollower(u);
                }}
              >
                {removingId === u.id ? (
                  <ActivityIndicator color={colors.textMuted} size="small" />
                ) : (
                  <Text variant="caption" style={{ color: colors.textMuted }}>
                    Kaldır
                  </Text>
                )}
              </Pressable>
            ) : (
              <FollowButton
                authorId={u.id}
                username={u.username}
                isFollowing={u.isFollowing}
                onToggle={(next) =>
                  setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, isFollowing: next } : item)))
                }
              />
            )}
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  loader: { marginTop: spacing.xl },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, gap: 2 },
  removeBtn: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
