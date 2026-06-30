import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { openChat as navigateToChat } from '../services/messagingNavigation';
import { Text } from '@/components/ui/Text';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import type { CallParticipant } from '@/features/calls/types';
import { useAuth } from '@/providers/AuthProvider';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';
import { fetchFriends, getOrCreateDirectConversation } from '../services/conversationData';

export function FriendsList() {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { colors } = useTheme();
  const [friends, setFriends] = useState<CallParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchFriends(user.id)
      .then(setFriends)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const openChat = async (friend: CallParticipant) => {
    if (!(await requireAuth('Mesaj'))) return;
    setBusyId(friend.id);
    const { conversationId, error } = await getOrCreateDirectConversation(friend.id);
    setBusyId(null);
    if (error) {
      Alert.alert('Sohbet başlatılamadı', error);
      return;
    }
    if (conversationId) navigateToChat(conversationId);
  };

  const renderItem = useCallback(
    ({ item: friend }: { item: CallParticipant }) => (
      <Pressable
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openChat(friend)}
        disabled={busyId === friend.id}
      >
        <CallAvatar participant={friend} size={48} showName={false} />
        <View style={styles.info}>
          <Text variant="label">{friend.full_name?.trim() || friend.username}</Text>
          <Text muted>@{friend.username}</Text>
        </View>
      </Pressable>
    ),
    [busyId, colors.border, colors.surface],
  );

  const keyExtractor = useCallback((item: CallParticipant) => item.id, []);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  if (friends.length === 0) {
    return (
      <Text secondary style={styles.empty}>
        Henüz arkadaşınız yok. Karşılıklı takipleştiğiniz kişiler burada görünür.
      </Text>
    );
  }

  return (
    <FlatList
      style={styles.listFlex}
      data={friends}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      {...getAndroidFlatListPerfProps()}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
  },
});
