import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminForceUpdatePanel } from '@/features/admin/components/system/AdminForceUpdatePanel';
import { AdminMaintenancePanel } from '@/features/admin/components/system/AdminMaintenancePanel';
import { AdminAppStoreLinksPanel } from '@/features/app-share/components/AdminAppStoreLinksPanel';
import { fetchSystemConfig } from '@/features/admin/services/phase2Management';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminSystemScreen() {
  const { colors } = useTheme();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const data = await fetchSystemConfig();
    setConfig(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const health = config?.system_health as Record<string, string> | undefined;

  return (
    <AdminShell
      title="Sistem"
      subtitle="Sağlık, mağaza linkleri, zorunlu güncelleme ve bakım"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : (
        <>
          <AdminSectionHeader title="Sistem sağlığı" />
          {health
            ? Object.entries(health).map(([key, val]) => (
                <GlassCard key={key} style={styles.row}>
                  <Text variant="label">{key}</Text>
                  <Text secondary variant="caption" style={{ color: val === 'ok' ? colors.success : colors.warning }}>
                    {val}
                  </Text>
                </GlassCard>
              ))
            : null}

          <AdminAppStoreLinksPanel initial={config?.app_store_links} onSaved={() => load(true)} />
          <AdminForceUpdatePanel initial={config?.min_app_version} onSaved={() => load(true)} />
          <AdminMaintenancePanel initial={config?.maintenance_mode} onSaved={() => load(true)} />
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
});
