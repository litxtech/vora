import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { getTrustScoreColor } from '@/features/profile/constants';
import { fetchFriendsList } from '@/features/profile/services/friendship';
import type { FriendUser } from '@/features/profile/services/friendship';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type FriendsListContentProps = {
  userId: string;
};

export function FriendsListContent({ userId }: FriendsListContentProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchFriendsList(userId, user?.id ?? null, search);
    setFriends(list);
    setLoading(false);
  }, [userId, user?.id, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <View style={styles.container}>
      <AuthHeader title="Arkadaşlar" showBack compact />

      <TextInput
        style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        placeholder="Ara..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : friends.length === 0 ? (
        <Text secondary style={styles.empty}>
          {search ? 'Sonuç bulunamadı.' : 'Henüz arkadaş yok. Karşılıklı takipleştiğiniz kişiler burada görünür.'}
        </Text>
      ) : (
        friends.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.row, { borderColor: colors.border }]}
            onPress={() => router.push(`/user/${f.id}` as never)}
          >
            <ProfileAvatar username={f.username} avatarUrl={f.avatarUrl} size={44} />
            <View style={styles.meta}>
              <Text variant="label" numberOfLines={1}>
                {f.fullName ?? f.username}
              </Text>
              <Text secondary variant="caption">
                @{f.username}
              </Text>
              <Text variant="caption" style={{ color: getTrustScoreColor(f.trustScore), fontSize: 11 }}>
                Güven: {f.trustScore}
              </Text>
            </View>
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
});
