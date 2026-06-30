import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { fetchStaffRequests, updateStaffRequestStatus } from '@/features/admin/services/phase3Management';
import { fetchAdminJobs, updateJobStatus } from '@/features/admin/services/statistics';
import {
  CommerceOpsActionFooter,
  CommerceOpsCardAccent,
  CommerceOpsStatusBadge,
  type StatusTone,
} from '@/features/commerce-ops/components/CommerceOpsCardParts';
import { MODULE_ACCENTS } from '@/features/commerce-ops/constants';
import {
  fetchAdminJobApplications,
  jobApplicationStatusLabel,
  removeAdminJobApplication,
} from '@/features/personnel-center/services/adminApplications';
import type { AdminJobApplicationRow } from '@/features/personnel-center/services/adminApplications';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StaffRow = Awaited<ReturnType<typeof fetchStaffRequests>>[number];
type JobRow = Record<string, unknown>;

type Props = {
  onCountsChange?: (pending: number) => void;
};

function applicationTone(status: string): StatusTone {
  if (status === 'sent') return 'warning';
  if (status === 'reviewing') return 'primary';
  if (status === 'accepted') return 'success';
  if (status === 'rejected') return 'danger';
  return 'default';
}

function PersonnelCard({
  accent,
  icon,
  category,
  title,
  subtitle,
  statusLabel,
  statusTone,
  children,
}: {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: StatusTone;
  children?: ReactNode;
}) {
  return (
    <GlassCard style={styles.card} padded={false}>
      <CommerceOpsCardAccent accent={accent} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18`, borderColor: `${accent}33` }]}>
            <Ionicons name={icon} size={18} color={accent} />
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.headerTop}>
              <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                {category}
              </Text>
              <CommerceOpsStatusBadge label={statusLabel} tone={statusTone} />
            </View>
            <Text variant="label" numberOfLines={2}>
              {title}
            </Text>
            <Text secondary variant="caption" numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        </View>
        {children ? <CommerceOpsActionFooter>{children}</CommerceOpsActionFooter> : null}
      </View>
    </GlassCard>
  );
}

export function CommerceOpsPersonnelTab({ onCountsChange }: Props) {
  const { colors } = useTheme();
  const [applications, setApplications] = useState<AdminJobApplicationRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [apps, staffRows, jobsRes] = await Promise.all([
      fetchAdminJobApplications(),
      fetchStaffRequests(),
      fetchAdminJobs(),
    ]);
    setApplications(apps);
    setStaff(staffRows);
    setJobs(jobsRes.data);
    onCountsChange?.(apps.filter((a) => a.status === 'sent' || a.status === 'reviewing').length);
    setLoading(false);
  }, [onCountsChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (id: string, action: () => Promise<{ error: string | null }>) => {
    setActionId(id);
    const { error } = await action();
    setActionId(null);
    if (error) Alert.alert('Hata', error);
    else await load();
  };

  if (loading) return <AdminEmptyState loading />;

  const pendingApps = applications.filter((a) => a.status === 'sent' || a.status === 'reviewing');
  const accent = MODULE_ACCENTS.personnel;

  return (
    <View style={styles.wrap}>
      <AdminSectionHeader title="İş başvuruları" hint={`${pendingApps.length} bekleyen inceleme`} />
      {pendingApps.length === 0 ? (
        <AdminEmptyState title="Bekleyen başvuru yok" message="Tüm başvurular incelendi." icon="document-text-outline" />
      ) : (
        pendingApps.slice(0, 15).map((app) => (
          <PersonnelCard
            key={app.id}
            accent={accent}
            icon="document-text-outline"
            category="Başvuru"
            title={app.listing_title}
            subtitle={`@${app.applicant_username} → @${app.employer_username}`}
            statusLabel={jobApplicationStatusLabel(app.status)}
            statusTone={applicationTone(app.status)}
          >
            <AdminActionChip
              label="Başvuruyu kaldır"
              icon="trash-outline"
              tone="danger"
              compact
              loading={actionId === app.id}
              onPress={() =>
                Alert.alert('Başvuruyu kaldır', 'Bu başvuru kalıcı olarak silinsin mi?', [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Kaldır',
                    style: 'destructive',
                    onPress: () => void run(app.id, () => removeAdminJobApplication(app.id)),
                  },
                ])
              }
            />
          </PersonnelCard>
        ))
      )}

      <AdminSectionHeader title="Personel arayan ilanlar" hint={`${staff.length} aktif kayıt`} />
      {staff.length === 0 ? (
        <AdminEmptyState title="İlan yok" icon="people-outline" />
      ) : (
        staff.slice(0, 10).map((item) => (
          <PersonnelCard
            key={item.id}
            accent={accent}
            icon="people-outline"
            category="Personel arayan"
            title={item.title}
            subtitle={`@${item.author_username} · ${item.region_id}`}
            statusLabel={item.status === 'published' ? 'Yayında' : item.status}
            statusTone={item.status === 'published' ? 'success' : 'default'}
          >
            {item.status === 'published' ? (
              <AdminActionChip
                label="Yayından kaldır"
                icon="eye-off-outline"
                tone="warning"
                compact
                loading={actionId === item.id}
                onPress={() => void run(item.id, () => updateStaffRequestStatus(item.id, 'removed'))}
              />
            ) : null}
          </PersonnelCard>
        ))
      )}

      <AdminSectionHeader title="İş ilanları" hint={`${jobs.length} kayıt`} />
      {jobs.length === 0 ? (
        <AdminEmptyState title="İş ilanı yok" icon="briefcase-outline" />
      ) : (
        jobs.slice(0, 10).map((job) => (
          <PersonnelCard
            key={job.id as string}
            accent={colors.primary}
            icon="briefcase-outline"
            category="İş ilanı"
            title={job.title as string}
            subtitle={`${job.job_type as string} · ${job.region_id as string ?? '—'}`}
            statusLabel={(job.status as string) === 'published' ? 'Yayında' : (job.status as string)}
            statusTone={(job.status as string) === 'published' ? 'success' : 'default'}
          >
            {job.status === 'published' ? (
              <AdminActionChip
                label="Yayından kaldır"
                icon="trash-outline"
                tone="danger"
                compact
                loading={actionId === job.id as string}
                onPress={() => void run(job.id as string, () => updateJobStatus(job.id as string, 'removed'))}
              />
            ) : null}
          </PersonnelCard>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: { overflow: 'hidden', marginBottom: spacing.xs },
  cardBody: { padding: spacing.md, paddingLeft: spacing.md + 4, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', gap: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: { flex: 1, gap: 2, minWidth: 0 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
