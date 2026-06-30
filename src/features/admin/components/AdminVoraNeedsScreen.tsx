import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import {
  formatVoraNeedDate,
  voraNeedCategoryLabel,
  VORA_NEED_STATUS_LABELS,
  VORA_NEED_VISIBILITY_LABELS,
} from '@/features/vora-needs/constants';
import {
  adminFeatureVoraNeed,
  adminUpdateVoraNeedStatus,
  fetchAdminVoraNeedReports,
  fetchAdminVoraNeeds,
  type AdminVoraNeedReportRow,
  type AdminVoraNeedRow,
} from '@/features/vora-needs/services/adminVoraNeeds';
import type { VoraNeedStatus } from '@/features/vora-needs/types';
import { spacing } from '@/constants/theme';

type Tab = 'listings' | 'reports';

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'reported', label: 'Şikayetli' },
  { id: 'reviewing', label: 'İnceleniyor' },
  { id: 'hidden', label: 'Gizli' },
  { id: 'removed', label: 'Kaldırıldı' },
];

export function AdminVoraNeedsScreen() {
  const guard = useAdminGuard();
  const [tab, setTab] = useState<Tab>('listings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState<AdminVoraNeedRow[]>([]);
  const [reports, setReports] = useState<AdminVoraNeedReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (guard.status !== 'allowed') return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [nextItems, nextReports] = await Promise.all([
      fetchAdminVoraNeeds(statusFilter === 'all' ? null : statusFilter),
      fetchAdminVoraNeedReports(),
    ]);
    setItems(nextItems);
    setReports(nextReports);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [guard.status, statusFilter]);

  const runStatus = async (item: AdminVoraNeedRow, status: VoraNeedStatus) => {
    setActionId(item.id);
    const { error } = await adminUpdateVoraNeedStatus(item.id, status);
    setActionId(null);
    if (error) Alert.alert('Hata', error);
    else load(true);
  };

  const runFeature = async (item: AdminVoraNeedRow, featured: boolean) => {
    setActionId(item.id);
    const { error } = await adminFeatureVoraNeed(item.id, featured);
    setActionId(null);
    if (error) Alert.alert('Hata', error);
    else load(true);
  };

  const tabOptions = useMemo(
    () => [
      { id: 'listings' as const, label: 'İlanlar' },
      { id: 'reports' as const, label: `Şikayetler (${reports.length})` },
    ],
    [reports.length],
  );

  return (
    <AdminShell
      title="İhtiyaç Ağı"
      subtitle="VORA ihtiyaç ilanları moderasyonu"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={tabOptions} value={tab} onChange={setTab} />

      {tab === 'listings' ? (
        <>
          <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

          {loading ? (
            <AdminEmptyState loading />
          ) : items.length === 0 ? (
            <AdminEmptyState title="İlan yok" message="Yönetilecek ihtiyaç ilanı bulunamadı." icon="hand-left-outline" />
          ) : (
            items.map((item) => (
              <GlassCard key={item.id} style={styles.row}>
                <Text variant="label">{item.title}</Text>
                <Text secondary variant="caption" numberOfLines={2}>
                  {item.description}
                </Text>
                <Text secondary variant="caption">
                  {formatVoraNeedDate(item.created_at)} · {item.region_id ?? 'Genel'} · @{item.author_username}
                </Text>
                <Text secondary variant="caption">
                  {voraNeedCategoryLabel(item.category)} · {VORA_NEED_VISIBILITY_LABELS[item.visibility as keyof typeof VORA_NEED_VISIBILITY_LABELS] ?? item.visibility}
                  {item.urgency === 'urgent' ? ' · Acil' : ''}
                  {item.is_featured ? ' · Öne çıkan' : ''}
                </Text>
                <Text secondary variant="caption">
                  Durum: {VORA_NEED_STATUS_LABELS[item.status as VoraNeedStatus] ?? item.status}
                  {item.report_count > 0 ? ` · ${item.report_count} şikayet` : ''}
                </Text>

                <View style={styles.actions}>
                  {item.status !== 'active' ? (
                    <AdminActionChip
                      label="Aktifleştir"
                      icon="checkmark-circle-outline"
                      tone="success"
                      loading={actionId === item.id}
                      onPress={() => runStatus(item, 'active')}
                    />
                  ) : (
                    <AdminActionChip
                      label="Gizle"
                      icon="eye-off-outline"
                      tone="warning"
                      loading={actionId === item.id}
                      onPress={() => runStatus(item, 'hidden')}
                    />
                  )}
                  <AdminActionChip
                    label="Kaldır"
                    icon="trash-outline"
                    tone="danger"
                    loading={actionId === item.id}
                    onPress={() => runStatus(item, 'removed')}
                  />
                  <AdminActionChip
                    label={item.is_featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}
                    icon="star-outline"
                    tone="accent"
                    loading={actionId === item.id}
                    onPress={() => runFeature(item, !item.is_featured)}
                  />
                </View>
              </GlassCard>
            ))
          )}
        </>
      ) : reports.length === 0 ? (
        <AdminEmptyState title="Şikayet yok" message="Bekleyen şikayet bulunamadı." icon="flag-outline" />
      ) : (
        reports.map((report) => (
          <GlassCard key={report.id} style={styles.row}>
            <Text variant="label">{report.need_title}</Text>
            <Text secondary variant="caption">
              Şikayet: {report.reason} · @{report.reporter_username}
            </Text>
            {report.details ? (
              <Text secondary variant="caption" numberOfLines={3}>
                {report.details}
              </Text>
            ) : null}
            <Text secondary variant="caption">
              {formatVoraNeedDate(report.created_at)} · İlan durumu: {report.need_status}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                label="İncelemeye al"
                icon="search-outline"
                tone="warning"
                onPress={() => adminUpdateVoraNeedStatus(report.need_id, 'reviewing').then(() => load(true))}
              />
              <AdminActionChip
                label="İlanı kaldır"
                icon="trash-outline"
                tone="danger"
                onPress={() => adminUpdateVoraNeedStatus(report.need_id, 'removed').then(() => load(true))}
              />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
