import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import {
  addCloseFriend,
  fetchAvailableFriends,
  fetchCloseFriends,
  removeCloseFriend,
  type CloseFriend,
} from '@/features/profile/services/closeFriends';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CloseFriendsManager() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [closeFriends, setCloseFriends] = useState<CloseFriend[]>([]);
  const [available, setAvailable] = useState<CloseFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [close, avail] = await Promise.all([
      fetchCloseFriends(user.id),
      fetchAvailableFriends(user.id),
    ]);
    setCloseFriends(close);
    setAvailable(avail);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (friendId: string) => {
    if (!user) return;
    const { error } = await addCloseFriend(user.id, friendId);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    await load();
    setShowAdd(false);
  };

  const handleRemove = (friend: CloseFriend) => {
    if (!user) return;
    Alert.alert('Kaldır', `@${friend.username} yakın arkadaşlardan kaldırılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          await removeCloseFriend(user.id, friend.id);
          await load();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <AuthHeader
        title="Yakın Arkadaşlar"
        subtitle="Yakın arkadaşlarınız özel içeriklerinizi ve yakın çevre paylaşımlarınızı görebilir."
      />

      <Pressable
        onPress={() => setShowAdd(!showAdd)}
        style={[styles.addBtn, { borderColor: colors.primary, backgroundColor: 'rgba(30,136,229,0.1)' }]}
      >
        <Ionicons name="person-add" size={18} color={colors.primary} />
        <Text variant="caption" style={{ color: colors.primary }}>
          {showAdd ? 'İptal' : 'Arkadaş Ekle'}
        </Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {showAdd && available.length > 0 ? (
            <View style={styles.section}>
              <Text variant="label">Eklenebilir Arkadaşlar</Text>
              {available.map((f) => (
                <Pressable
                  key={f.id}
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => handleAdd(f.id)}
                >
                  <ProfileAvatar username={f.username} avatarUrl={f.avatarUrl} size={40} />
                  <View style={styles.meta}>
                    <Text variant="label">{f.fullName ?? f.username}</Text>
                    <Text secondary variant="caption">
                      @{f.username}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {showAdd && available.length === 0 ? (
            <Text secondary>Eklenebilecek arkadaş kalmadı.</Text>
          ) : null}

          <View style={styles.section}>
            <Text variant="label">Yakın Arkadaşlar ({closeFriends.length})</Text>
            {closeFriends.length === 0 ? (
              <Text secondary>Henüz yakın arkadaş eklemediniz.</Text>
            ) : (
              closeFriends.map((f) => (
                <View key={f.id} style={[styles.row, { borderColor: colors.border }]}>
                  <Pressable
                    style={styles.rowInner}
                    onPress={() => router.push(`/user/${f.id}` as never)}
                  >
                    <ProfileAvatar username={f.username} avatarUrl={f.avatarUrl} size={40} />
                    <View style={styles.meta}>
                      <Text variant="label">{f.fullName ?? f.username}</Text>
                      <Text secondary variant="caption">
                        @{f.username}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => handleRemove(f)}>
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  section: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flex: 1, gap: 2 },
});
