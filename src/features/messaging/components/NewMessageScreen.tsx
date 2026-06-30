import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useTheme } from '@/providers/ThemeProvider';
import { fetchHiddenAuthors } from '@/features/moderation/services/relationships';
import { fetchConversationList, fetchFriends, getOrCreateDirectConversation } from '../services/conversationData';
import { openChat } from '../services/messagingNavigation';
import { filterBlockedUsers, searchMessagingUsers } from '../services/userSearch';
import type { MessagingParticipant } from '../types';
import { displayParticipantName } from '../utils';
import { useChatTheme } from '../hooks/useChatTheme';

export function NewMessageScreen() {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { colors } = useTheme();
  const chat = useChatTheme();
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<MessagingParticipant[]>([]);
  const [recentContacts, setRecentContacts] = useState<MessagingParticipant[]>([]);
  const [results, setResults] = useState<MessagingParticipant[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetchFriends(user.id).then((rows) =>
        rows.map((r) => ({
          id: r.id,
          username: r.username,
          full_name: r.full_name,
          avatar_url: r.avatar_url,
        })),
      ),
      fetchConversationList().then((conversations) =>
        conversations
          .filter((c) => c.type === 'direct' && c.otherUser)
          .map((c) => c.otherUser!)
          .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx),
      ),
      fetchHiddenAuthors(user.id).then((h) => {
        const ids = new Set<string>();
        h.blocked.forEach((id) => ids.add(id));
        return ids;
      }),
    ])
      .then(([f, recent, blocked]) => {
        setFriends(filterBlockedUsers(f, blocked, user.id));
        setRecentContacts(filterBlockedUsers(recent, blocked, user.id));
        setBlockedIds(blocked);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchMessagingUsers(q);
        setResults(filterBlockedUsers(found, blockedIds, user.id));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.id, blockedIds]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length >= 2) return results;

    const base = [...recentContacts, ...friends].filter(
      (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx,
    );

    if (!q) return base;
    return base.filter((f) => {
      const name = displayParticipantName(f).toLowerCase();
      return name.includes(q) || f.username.toLowerCase().includes(q);
    });
  }, [query, friends, recentContacts, results]);

  const startChat = useCallback(
    async (participant: MessagingParticipant) => {
      if (!user?.id) return;
      if (!(await requireAuth('Mesaj'))) return;
      setBusyId(participant.id);
      const { conversationId, error } = await getOrCreateDirectConversation(participant.id);
      setBusyId(null);
      if (error) {
        Alert.alert('Mesaj başlatılamadı', error);
        return;
      }
      if (conversationId) {
        openChat(conversationId, { replace: true });
      }
    },
    [user?.id, requireAuth],
  );

  const renderItem = ({ item }: { item: MessagingParticipant }) => (
    <Pressable
      style={[styles.row, { backgroundColor: chat.rowBg, borderColor: chat.rowBorder }]}
      onPress={() => startChat(item)}
      disabled={busyId === item.id}
    >
      <CallAvatar
        participant={{
          id: item.id,
          username: item.username,
          full_name: item.full_name,
          avatar_url: item.avatar_url,
        }}
        size={48}
        showName={false}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text variant="label">{displayParticipantName(item)}</Text>
          {item.is_verified ? (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          ) : null}
        </View>
        <Text muted>@{item.username}</Text>
      </View>
      {busyId === item.id ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <View style={[styles.chatBtn, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="chatbubble" size={18} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <View style={[styles.backBtn, { backgroundColor: chat.inputBg }]}>
            <ScreenBackButton />
          </View>
          <Text variant="h3">Yeni mesaj</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.searchWrap, { backgroundColor: chat.searchBg, borderColor: chat.rowBorder }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.search, { color: colors.text }]}
            placeholder="İsim veya kullanıcı adı ara…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            editable
            returnKeyType="search"
            keyboardType="default"
            textAlignVertical="center"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : searching ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : null}
        </View>

        <Text variant="caption" secondary style={styles.hint}>
          {query.trim().length < 2
            ? 'Son sohbetler, arkadaşlar ve öneriler'
            : `${suggestions.length} sonuç`}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="person-outline" size={36} color={colors.textMuted} />
                <Text secondary style={styles.empty}>
                  {query.trim().length >= 2
                    ? 'Kullanıcı bulunamadı veya engellenmiş.'
                    : 'Mesaj gönderebileceğiniz kişi bulunamadı.'}
                </Text>
              </View>
            }
            renderItem={renderItem}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 36 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  search: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  hint: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  loader: { marginTop: spacing.xl },
  list: {
    paddingHorizontal: spacing.md,
    gap: 8,
    paddingBottom: spacing.xxl,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
