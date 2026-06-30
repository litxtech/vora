import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fetchHiddenAuthors } from '@/features/moderation/services/relationships';
import { fetchConversationList } from '../services/conversationData';
import { filterBlockedUsers, searchMessagingUsers } from '../services/userSearch';
import type { MessagingParticipant } from '../types';
import { displayParticipantName } from '../utils';
import { useChatTheme } from '../hooks/useChatTheme';

type GroupMemberPickerProps = {
  excludeIds?: Set<string>;
  selected: Set<string>;
  onToggle: (userId: string) => void;
  disabledIds?: Set<string>;
};

type Section = {
  key: string;
  title: string;
  data: MessagingParticipant[];
  emptyHint?: string;
};

export function GroupMemberPicker({
  excludeIds = new Set(),
  selected,
  onToggle,
  disabledIds = new Set(),
}: GroupMemberPickerProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const chat = useChatTheme();
  const [query, setQuery] = useState('');
  const [recentContacts, setRecentContacts] = useState<MessagingParticipant[]>([]);
  const [searchResults, setSearchResults] = useState<MessagingParticipant[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
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
      .then(([recent, blocked]) => {
        setRecentContacts(filterBlockedUsers(recent, blocked, user.id));
        setBlockedIds(blocked);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchMessagingUsers(q);
        setSearchResults(filterBlockedUsers(found, blockedIds, user.id));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.id, blockedIds]);

  const filterAvailable = useCallback(
    (users: MessagingParticipant[]) => {
      const q = query.trim().toLowerCase();
      return users.filter((p) => {
        if (excludeIds.has(p.id)) return false;
        if (q.length < 2) return true;
        const name = displayParticipantName(p).toLowerCase();
        return name.includes(q) || p.username.toLowerCase().includes(q);
      });
    },
    [excludeIds, query],
  );

  const sections = useMemo((): Section[] => {
    const q = query.trim();
    const recent = filterAvailable(recentContacts);
    const searched = filterAvailable(searchResults);

    if (q.length >= 2) {
      return [
        {
          key: 'search',
          title: 'Kullanıcı Ara',
          data: searched,
          emptyHint: searching ? undefined : 'Kullanıcı bulunamadı.',
        },
      ];
    }

    return [
      {
        key: 'recent',
        title: 'Mesajlaştıklarınız',
        data: recent,
        emptyHint: 'Henüz mesajlaştığınız kişi yok.',
      },
      {
        key: 'search-hint',
        title: 'Kullanıcı Ara',
        data: [],
        emptyHint: 'İsim veya kullanıcı adı yazarak arayın (en az 2 karakter).',
      },
    ];
  }, [query, recentContacts, searchResults, filterAvailable, searching]);

  const renderRow = ({ item }: { item: MessagingParticipant }) => {
    const isSelected = selected.has(item.id);
    const isDisabled = disabledIds.has(item.id);

    return (
      <Pressable
        style={[
          styles.row,
          {
            backgroundColor: chat.rowBg,
            borderColor: isSelected ? colors.primary : chat.rowBorder,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !isDisabled && onToggle(item.id)}
        disabled={isDisabled}
      >
        <CallAvatar participant={item} size={44} showName={false} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text variant="label">{displayParticipantName(item)}</Text>
            {item.is_verified ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            ) : null}
          </View>
          <Text muted>@{item.username}</Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isSelected ? colors.primary : colors.textSecondary}
        />
      </Pressable>
    );
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.searchWrap, { backgroundColor: chat.searchBg, borderColor: chat.rowBorder }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.search, { color: colors.text }]}
          placeholder="İsim veya kullanıcı adı ara…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : searching ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="label" secondary style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderItem={renderRow}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 && section.emptyHint ? (
            <Text muted variant="caption" style={styles.sectionEmpty}>
              {section.emptyHint}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text secondary style={styles.empty}>
            Eklenebilecek kullanıcı bulunamadı.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: spacing.xl },
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
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: 8,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionEmpty: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 8,
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
