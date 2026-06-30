import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { DISCOVERY_USER_SEARCH_MIN_LENGTH } from '@/features/discovery/constants';
import { addCommunityMembers } from '@/features/communities/services/communityData';
import {
  fetchInvitableFriends,
  searchInvitableUsers,
  type InvitableUser,
} from '@/features/communities/services/communityInvite';
import type { CommunityDetail } from '@/features/communities/types';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type InviteTab = 'friends' | 'search';

type CommunityInviteSheetProps = {
  visible: boolean;
  detail: CommunityDetail;
  onClose: () => void;
  onAdded: () => void;
};

export function CommunityInviteSheet({ visible, detail, onClose, onAdded }: CommunityInviteSheetProps) {
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const surface = glassSurface[mode];
  const [tab, setTab] = useState<InviteTab>('friends');
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<InvitableUser[]>([]);
  const [searchResults, setSearchResults] = useState<InvitableUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setFriends(await fetchInvitableFriends(user.id, detail.members, tab === 'friends' ? search : ''));
    } finally {
      setLoading(false);
    }
  }, [user?.id, detail.members, search, tab]);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set());
    setSearch('');
    setTab('friends');
  }, [visible]);

  useEffect(() => {
    if (!visible || tab !== 'friends') return;
    const timer = setTimeout(loadFriends, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [visible, tab, loadFriends, search]);

  useEffect(() => {
    if (!visible || tab !== 'search') return;
    const q = search.trim();
    if (q.length < DISCOVERY_USER_SEARCH_MIN_LENGTH) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await searchInvitableUsers(q, detail.members, user?.id ?? null));
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [visible, tab, search, detail.members, user?.id]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      Alert.alert('Kişi seçin', 'Topluluğa eklemek için en az bir kullanıcı seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const { added, error } = await addCommunityMembers(detail.id, [...selected]);
      if (error) {
        Alert.alert('Hata', error);
        return;
      }
      Alert.alert('Eklendi', `${added} kişi topluluğa eklendi.`);
      onAdded();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const rows = tab === 'friends' ? friends : searchResults;
  const showSearchHint =
    tab === 'search' && search.trim().length > 0 && search.trim().length < DISCOVERY_USER_SEARCH_MIN_LENGTH;

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: surface.handle }]} />
          <View style={styles.header}>
            <Text variant="h3">Üye Ekle</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['friends', 'search'] as InviteTab[]).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, active && { backgroundColor: colors.primary }]}
                >
                  <Text
                    variant="caption"
                    style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '700' }}
                  >
                    {t === 'friends' ? 'Arkadaşlar' : 'Kullanıcı Ara'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder={tab === 'friends' ? 'Arkadaşlarında ara…' : 'İsim veya kullanıcı adı…'}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {showSearchHint ? (
            <Text secondary variant="caption">
              Aramak için en az {DISCOVERY_USER_SEARCH_MIN_LENGTH} karakter yazın.
            </Text>
          ) : null}

          <View style={styles.listWrap}>
            {loading || searching ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                  <Text secondary variant="caption" style={styles.empty}>
                    {tab === 'friends'
                      ? search
                        ? 'Eklenebilecek arkadaş bulunamadı.'
                        : 'Eklenebilecek arkadaş yok veya hepsi zaten üye.'
                      : search.trim().length >= DISCOVERY_USER_SEARCH_MIN_LENGTH
                        ? 'Kullanıcı bulunamadı.'
                        : 'Kullanıcı arayın veya arkadaşlar sekmesine geçin.'}
                  </Text>
                }
                renderItem={({ item }) => {
                  const active = selected.has(item.id);
                  return (
                    <Pressable
                      style={[styles.row, { borderColor: colors.border }]}
                      onPress={() => toggle(item.id)}
                    >
                      <ProfileAvatar username={item.username} avatarUrl={item.avatarUrl} size={44} />
                      <View style={styles.rowInfo}>
                        <Text variant="label" numberOfLines={1}>
                          {item.fullName ?? item.username}
                        </Text>
                        <Text secondary variant="caption">
                          @{item.username}
                        </Text>
                      </View>
                      <Ionicons
                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={active ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          <Button
            title={selected.size > 0 ? `${selected.size} kişiyi ekle` : 'Seç ve ekle'}
            onPress={handleAdd}
            loading={submitting}
            disabled={selected.size === 0}
          />
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  listWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 160,
    maxHeight: 360,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
});
