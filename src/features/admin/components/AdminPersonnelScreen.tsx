import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  fetchJobSeekers,
  fetchStaffRequests,
  updateJobSeekerStatus,
  updateStaffRequestStatus,
  type JobSeekerRow,
  type StaffRequestRow,
} from '@/features/admin/services/phase3Management';
import {
  fetchAdminJobApplications,
  jobApplicationStatusLabel,
  removeAdminJobApplication,
  type AdminJobApplicationRow,
} from '@/features/personnel-center/services/adminApplications';
import type { JobApplicationStatus } from '@/features/personnel-center/types';
import { spacing } from '@/constants/theme';

type Tab = 'staff' | 'seekers' | 'applications';

const TABS = [
  { id: 'staff' as const, label: 'Personel Arayan' },
  { id: 'seekers' as const, label: 'İş Arayanlar' },
  { id: 'applications' as const, label: 'Başvurular' },
];

export function AdminPersonnelScreen() {
  const [tab, setTab] = useState<Tab>('staff');
  const [applications, setApplications] = useState<AdminJobApplicationRow[]>([]);
  const [staff, setStaff] = useState<StaffRequestRow[]>([]);
  const [seekers, setSeekers] = useState<JobSeekerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    if (tab === 'staff') setStaff(await fetchStaffRequests());
    else if (tab === 'seekers') setSeekers(await fetchJobSeekers());
    else setApplications(await fetchAdminJobApplications());
    setLoading(false);
    setRefreshing(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: string, action: () => Promise<{ error: string | null }>) => {
    setActionId(id);
    const { error } = await action();
    setActionId(null);
    if (error) Alert.alert('İşlem başarısız', error);
    else await load(true);
  };

  const confirmRemove = (id: string, title: string, action: () => Promise<{ error: string | null }>) => {
    Alert.alert('Kaldır', `${title} kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => void runAction(id, action) },
    ]);
  };

  return (
    <AdminShell
      title="Personel & İş Arayan"
      subtitle="Personel arayan ilanları ve iş arayan profilleri"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />
      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'staff' ? (
        staff.length === 0 ? (
          <AdminEmptyState title="İlan yok" message="Personel arayan ilan bulunamadı." icon="people-outline" />
        ) : (
          staff.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">{item.title}</Text>
              <Text secondary variant="caption" numberOfLines={2}>
                {item.description}
              </Text>
              <Text secondary variant="caption">
                @{item.author_username} · {item.region_id} · {item.job_type} · {item.status}
              </Text>
              {item.status === 'published' ? (
                <AdminActionChip
                  label="İlanı yayından kaldır"
                  icon="trash-outline"
                  tone="danger"
                  loading={actionId === item.id}
                  disabled={Boolean(actionId)}
                  onPress={() =>
                    confirmRemove(item.id, item.title, () => updateStaffRequestStatus(item.id, 'removed'))
                  }
                />
              ) : null}
            </GlassCard>
          ))
        )
      ) : tab === 'applications' ? (
        applications.length === 0 ? (
          <AdminEmptyState title="Başvuru yok" message="İş başvurusu bulunamadı." icon="document-text-outline" />
        ) : (
          applications.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">{item.listing_title}</Text>
              <Text secondary variant="caption">
                @{item.applicant_username} → @{item.employer_username}
              </Text>
              <Text secondary variant="caption">
                {jobApplicationStatusLabel(item.status as JobApplicationStatus)} · {item.listing_type} ·{' '}
                {new Date(item.created_at).toLocaleString('tr-TR')}
              </Text>
              {item.message ? (
                <Text secondary variant="caption" numberOfLines={2}>
                  {item.message}
                </Text>
              ) : null}
              <AdminActionChip
                label="Başvuruyu kaldır"
                icon="trash-outline"
                tone="danger"
                loading={actionId === item.id}
                disabled={Boolean(actionId)}
                onPress={() =>
                  confirmRemove(item.id, item.listing_title, () =>
                    removeAdminJobApplication(item.id, 'Admin moderasyon'),
                  )
                }
              />
            </GlassCard>
          ))
        )
      ) : seekers.length === 0 ? (
        <AdminEmptyState title="Profil yok" message="İş arayan profil bulunamadı." icon="person-outline" />
      ) : (
        seekers.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.title}</Text>
            <Text secondary variant="caption">
              @{item.username} · {item.occupation} · {item.region_id}
            </Text>
            <Text secondary variant="caption">
              {item.is_ready ? 'Hazır' : 'Pasif'}
              {item.is_visible_on_map ? ' · Haritada' : ''} · {item.status}
            </Text>
            {item.status === 'published' ? (
              <AdminActionChip
                label="Profili yayından kaldır"
                icon="trash-outline"
                tone="danger"
                loading={actionId === item.id}
                disabled={Boolean(actionId)}
                onPress={() =>
                  confirmRemove(item.id, item.title, () => updateJobSeekerStatus(item.id, 'removed'))
                }
              />
            ) : null}
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
