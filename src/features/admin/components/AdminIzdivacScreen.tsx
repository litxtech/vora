import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { GENDER_OPTIONS } from '@/constants/registration';
import {
  fetchAdminIzdivacUsers,
  grantIzdivacAccess,
  revokeIzdivacAccess,
} from '@/features/izdivac/services/adminIzdivac';
import { IzdivacBadgeAdminSheet } from '@/features/izdivac/components/IzdivacBadgeAdminSheet';
import type { AdminIzdivacUserRow } from '@/features/izdivac/types';
import { spacing } from '@/constants/theme';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { useTheme } from '@/providers/ThemeProvider';

function genderLabel(gender: AdminIzdivacUserRow['gender']) {
  if (!gender) return '—';
  return GENDER_OPTIONS.find((o) => o.id === gender)?.label ?? gender;
}

export function AdminIzdivacScreen() {
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [users, setUsers] = useState<AdminIzdivacUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [badgeUser, setBadgeUser] = useState<AdminIzdivacUserRow | null>(null);

  const load = useCallback(
    async (query = search) => {
      if (guard.status !== 'allowed') return;
      setLoading(true);
      const result = await fetchAdminIzdivacUsers(query);
      setUsers(result.data);
      setLoading(false);
      if (result.error) Alert.alert('Hata', result.error);
    },
    [guard.status, search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const runToggle = async (user: AdminIzdivacUserRow, grant: boolean) => {
    setActionId(user.userId);
    const result = grant
      ? await grantIzdivacAccess(user.userId)
      : await revokeIzdivacAccess(user.userId);
    setActionId(null);
    if (result.error) Alert.alert('Hata', result.error);
    else void load();
  };

  if (guard.status === 'denied') return null;

  return (
    <AdminShell title="İzdivaç Erişimi" requireAdmin scrollable={false}>
      <View style={styles.content}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Kullanıcı ara..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            onSubmitEditing={() => void load(search)}
            returnKeyType="search"
          />
          <Pressable onPress={() => void load(search)} hitSlop={8}>
            <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <AdminActionChip
            compact
            label="Tik Notlarını Düzenle"
            icon="ribbon-outline"
            tone="default"
            onPress={() => router.push('/admin/izdivac-badge-notes' as never)}
          />
        </View>

        {loading ? (
          <AdminEmptyState loading />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.userId}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<AdminEmptyState title="Kullanıcı bulunamadı" icon="people-outline" />}
            renderItem={({ item }) => (
              <GlassCard style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <Text variant="label">@{item.username}</Text>
                    <Text secondary variant="caption">
                      {item.fullName ?? '—'} · {genderLabel(item.gender)}
                    </Text>
                    <Text secondary variant="caption">
                      {item.izdivacAccessGranted ? 'Erişim açık' : 'Erişim kapalı'}
                      {item.inLobby ? ' · Lobide' : ''}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <AdminActionChip
                      compact
                      label="Profil"
                      icon="person-outline"
                      tone="default"
                      onPress={() => router.push(`/admin/users/${item.userId}` as never)}
                    />
                    <AdminActionChip
                      compact
                      label="Tikler"
                      icon="ribbon-outline"
                      tone="default"
                      onPress={() => setBadgeUser(item)}
                    />
                    {item.izdivacAccessGranted ? (
                      <AdminActionChip
                        compact
                        label="Kaldır"
                        icon="close-circle-outline"
                        tone="danger"
                        loading={actionId === item.userId}
                        onPress={() => runToggle(item, false)}
                      />
                    ) : (
                      <AdminActionChip
                        compact
                        label="Aç"
                        icon="heart-half-outline"
                        tone="success"
                        loading={actionId === item.userId}
                        onPress={() => runToggle(item, true)}
                      />
                    )}
                  </View>
                </View>
              </GlassCard>
            )}
          />
        )}

        <IzdivacBadgeAdminSheet
          visible={badgeUser != null}
          userId={badgeUser?.userId ?? null}
          username={badgeUser?.username ?? null}
          onClose={() => setBadgeUser(null)}
        />
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: spacing.xs },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
  row: { gap: spacing.sm },
  copy: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
