import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { exitAdminPanel } from '@/features/admin/services/adminNavigation';
import { Text } from '@/components/ui/Text';
import { AdminDashboardOverview } from '@/features/admin/components/dashboard/AdminDashboardOverview';
import { AdminMenuGrid } from '@/features/admin/components/shared/AdminMenuGrid';
import { AdminNewDataAlert } from '@/features/admin/components/shared/AdminNewDataAlert';
import { AdminPanelSearch } from '@/features/admin/components/shared/AdminPanelSearch';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useModeratorGuard } from '@/features/admin/hooks/useAdminGuard';
import { useAdminPermissions } from '@/features/admin/hooks/useAdminPermissions';
import { useAdminDashboardPoll } from '@/features/admin/hooks/useAdminDashboardPoll';
import { ROLE_LABELS } from '@/constants/roles';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';

export function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const guard = useModeratorGuard();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        exitAdminPanel();
        return true;
      });
      return () => sub.remove();
    }, []),
  );
  const enabled = guard.status === 'allowed';
  const isAdmin = guard.status === 'allowed' ? guard.isAdmin : false;
  const { permissions } = useAdminPermissions(enabled);
  const [menuQuery, setMenuQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const { stats, loading, refreshing, error, newAlerts, dismissAlert, refresh } = useAdminDashboardPoll(enabled);

  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : '';

  return (
    <AdminShell
      title="Yönetim Merkezi"
      subtitle="Platform kontrol paneli"
      badge={roleLabel}
      showBack
      backLabel="Uygulamaya dön"
      onBack={exitAdminPanel}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <Text style={{ color: colors.danger }}>{error}</Text>
      ) : (
        <>
          {!searchActive && stats ? (
            <View style={styles.dashboard}>
              {newAlerts.length > 0 ? (
                <View style={styles.newAlerts}>
                  {newAlerts.map((alert) => (
                    <AdminNewDataAlert
                      key={alert.id}
                      message={alert.message}
                      tone={alert.tone}
                      onDismiss={() => dismissAlert(alert.id)}
                    />
                  ))}
                </View>
              ) : null}

              <AdminDashboardOverview stats={stats} refreshing={refreshing} />
            </View>
          ) : null}

          <AdminSectionHeader
            title={searchActive ? 'Arama sonuçları' : 'Modüller'}
            hint={
              searchActive
                ? menuQuery.trim()
                  ? `"${menuQuery.trim()}" eşleşmeleri tüm sekmelerde`
                  : 'Önerilen modüller tüm sekmelerden'
                : 'Hızlı erişim'
            }
          />
          <AdminPanelSearch
            isAdmin={isAdmin}
            permissions={permissions}
            role={profile?.role}
            onQueryChange={setMenuQuery}
            onActiveChange={setSearchActive}
          />

          <AdminMenuGrid
            isAdmin={isAdmin}
            permissions={permissions}
            role={profile?.role}
            query={menuQuery}
            stats={stats}
          />
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  dashboard: { gap: spacing.md },
  newAlerts: { gap: spacing.xs },
});
