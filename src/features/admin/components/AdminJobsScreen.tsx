import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { fetchAdminJobs, updateJobStatus } from '@/features/admin/services/statistics';
import { spacing } from '@/constants/theme';

export function AdminJobsScreen() {
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await fetchAdminJobs();
    setJobs(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = (id: string) => {
    Alert.alert('İlanı kaldır', 'Sahte veya uygunsuz ilan kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          await updateJobStatus(id, 'removed');
          load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="İş İlanı Yönetimi"
      subtitle="Sahte ilanları kaldır, premium yönet"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : jobs.length === 0 ? (
        <AdminEmptyState title="İlan yok" message="Yönetilecek iş ilanı bulunamadı." icon="briefcase-outline" />
      ) : (
        jobs.map((job) => (
          <GlassCard key={job.id as string} style={styles.row}>
            <Text variant="label">{job.title as string}</Text>
            <Text secondary variant="caption" numberOfLines={2}>
              {job.description as string}
            </Text>
            <Text secondary variant="caption">
              {job.status as string} · {job.job_type as string}
            </Text>
            {job.status === 'published' ? (
              <AdminActionChip
                label="Kaldır"
                icon="trash-outline"
                tone="danger"
                onPress={() => handleRemove(job.id as string)}
              />
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
});
