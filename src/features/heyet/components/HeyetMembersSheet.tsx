import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { fetchAdminUsers } from '@/features/admin/services/userManagement';
import type { AdminUserRow } from '@/features/admin/types';
import { HEYET_ACCENT } from '@/features/heyet/constants';
import {
  adminHeyetAddMembers,
  adminHeyetRemoveMember,
} from '@/features/heyet/services/heyetData';
import type { HeyetCase } from '@/features/heyet/types';
import { fetchConversationMembers } from '@/features/messaging/services/groupData';
import type { ConversationMember } from '@/features/messaging/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  heyetCase: HeyetCase;
  onClose: () => void;
  onChanged: () => void;
};

export function HeyetMembersSheet({ visible, heyetCase, onClose, onChanged }: Props) {
  const { colors } = useTheme();
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchConversationMembers(heyetCase.conversationId);
      setMembers(list);
    } catch {
      setMembers([]);
    }
    setLoading(false);
  }, [heyetCase.conversationId]);

  useEffect(() => {
    if (!visible) return;
    void loadMembers();
    setQuery('');
    setResults([]);
    setSelected(new Set());
  }, [visible, loadMembers]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await fetchAdminUsers(trimmed.replace(/^@/, ''), 12);
      const memberIds = new Set(members.map((m) => m.userId));
      setResults((data as unknown as AdminUserRow[]).filter((u) => !memberIds.has(u.id)));
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, members]);

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const { added, error } = await adminHeyetAddMembers(heyetCase.id, [...selected]);
    setBusy(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    setSelected(new Set());
    setQuery('');
    setResults([]);
    await loadMembers();
    onChanged();
    if (added > 0) Alert.alert('Eklendi', `${added} üye heyet sohbetine eklendi.`);
  };

  const handleRemove = (member: ConversationMember) => {
    if (member.role === 'founder') return;
    Alert.alert('Üyeyi çıkar', `@${member.username} heyet sohbetinden çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error } = await adminHeyetRemoveMember(heyetCase.id, member.userId);
          setBusy(false);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }
          await loadMembers();
          onChanged();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text variant="label">Heyet üyeleri</Text>
          <Text secondary variant="caption">
            Tarafları ekleyin veya çıkarın. Kurucu (admin) çıkarılamaz.
          </Text>

          <Text variant="caption" style={{ color: HEYET_ACCENT, fontWeight: '700', marginTop: spacing.xs }}>
            Mevcut üyeler ({members.length})
          </Text>

          {loading ? (
            <ActivityIndicator color={HEYET_ACCENT} style={styles.loader} />
          ) : (
            <ScrollView style={styles.memberList} nestedScrollEnabled>
              {members.map((member) => (
                <View key={member.userId} style={[styles.memberRow, { borderColor: colors.border }]}>
                  <View style={styles.memberCopy}>
                    <Text variant="label">@{member.username}</Text>
                    {member.fullName ? (
                      <Text secondary variant="caption">
                        {member.fullName}
                      </Text>
                    ) : null}
                  </View>
                  {member.role === 'founder' ? (
                    <Text variant="caption" muted>
                      Kurucu
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => handleRemove(member)}
                      disabled={busy}
                      hitSlop={8}
                      accessibilityLabel="Üyeyi çıkar"
                    >
                      <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <AdminSearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Kullanıcı ara ve ekle…"
          />

          {searching ? <ActivityIndicator size="small" color={HEYET_ACCENT} /> : null}

          {results.length > 0 ? (
            <ScrollView style={styles.searchResults} nestedScrollEnabled>
              {results.map((user) => {
                const picked = selected.has(user.id);
                return (
                  <Pressable
                    key={user.id}
                    style={[styles.resultRow, { borderColor: colors.border, backgroundColor: picked ? `${HEYET_ACCENT}12` : 'transparent' }]}
                    onPress={() => toggleSelect(user.id)}
                  >
                    <Ionicons
                      name={picked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={picked ? HEYET_ACCENT : colors.textMuted}
                    />
                    <View style={styles.memberCopy}>
                      <Text variant="label">@{user.username}</Text>
                      {user.full_name ? (
                        <Text secondary variant="caption">
                          {user.full_name}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            <Button title="Kapat" variant="outline" onPress={onClose} fullWidth={false} />
            <Button
              title={selected.size > 0 ? `${selected.size} üye ekle` : 'Üye seçin'}
              onPress={() => void handleAdd()}
              loading={busy}
              disabled={selected.size === 0}
              fullWidth={false}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: spacing.xs,
  },
  loader: {
    paddingVertical: spacing.md,
  },
  memberList: {
    maxHeight: 160,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  memberCopy: {
    flex: 1,
    gap: 2,
  },
  searchResults: {
    maxHeight: 140,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
