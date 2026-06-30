import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminUserListRow } from '@/features/admin/components/shared/AdminUserListRow';
import { fetchAdminUsers } from '@/features/admin/services/userManagement';
import type { AdminUserRow } from '@/features/admin/types';
import { spacing } from '@/constants/theme';

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await fetchAdminUsers(search);
      setUsers(data as unknown as AdminUserRow[]);
      setLoading(false);
      setRefreshing(false);
    },
    [search],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <AdminShell
      title="Kullanıcı Yönetimi"
      subtitle="Profil, rol, ban ve tüm hesap işlemleri"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Kullanıcı adı veya ad ara..." />

      {!loading && users.length > 0 ? (
        <Text variant="caption" secondary style={styles.count}>
          {users.length} kullanıcı
        </Text>
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : users.length === 0 ? (
        <AdminEmptyState
          title="Kullanıcı bulunamadı"
          message={search ? 'Arama kriterine uygun kullanıcı yok.' : 'Henüz kayıtlı kullanıcı yok.'}
          icon="people-outline"
        />
      ) : (
        <View style={styles.list}>
          {users.map((user) => (
            <AdminUserListRow
              key={user.id}
              user={user}
              onPress={() => router.push(`/admin/users/${user.id}` as never)}
            />
          ))}
        </View>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  count: {
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
});
