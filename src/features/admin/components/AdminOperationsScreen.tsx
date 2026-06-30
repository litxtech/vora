import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { BROADCAST_TYPE_LABELS } from '@/features/admin/constants';
import type { BroadcastType } from '@/features/admin/types';
import {
  cancelScheduledBroadcast,
  cancelVoraStudioJob,
  createScheduledBroadcastLegacy,
  deleteScheduledBroadcast,
  fetchModeratorWorkload,
  fetchScheduledBroadcasts,
  fetchVoraStudioJobs,
  retryVoraStudioJob,
  updateScheduledBroadcastLegacy,
  type ModeratorWorkloadRow,
  type ScheduledBroadcastRow,
  type VoraStudioJobRow,
} from '@/features/admin/services/operationsManagement';
import { spacing } from '@/constants/theme';

const TYPE_OPTIONS = (Object.keys(BROADCAST_TYPE_LABELS) as BroadcastType[]).map((t) => ({
  id: t,
  label: BROADCAST_TYPE_LABELS[t],
}));

const SCHEDULE_OFFSETS = [
  { id: '30m', label: '30 dk', ms: 30 * 60 * 1000 },
  { id: '1h', label: '1 saat', ms: 60 * 60 * 1000 },
  { id: '3h', label: '3 saat', ms: 3 * 60 * 60 * 1000 },
  { id: 'tomorrow', label: 'Yarın 09:00', ms: 0 },
] as const;

function offsetToIso(offsetId: (typeof SCHEDULE_OFFSETS)[number]['id']): string {
  if (offsetId === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  const preset = SCHEDULE_OFFSETS.find((o) => o.id === offsetId);
  return new Date(Date.now() + (preset?.ms ?? 60 * 60 * 1000)).toISOString();
}

function broadcastStatusLabel(b: ScheduledBroadcastRow): string {
  if (b.is_sent) return 'Gönderildi';
  if (b.is_cancelled) return 'İptal edildi';
  return 'Bekliyor';
}

function isBroadcastPending(b: ScheduledBroadcastRow): boolean {
  return !b.is_sent && !b.is_cancelled;
}

export function AdminOperationsScreen() {
  const [workload, setWorkload] = useState<ModeratorWorkloadRow[]>([]);
  const [broadcasts, setBroadcasts] = useState<ScheduledBroadcastRow[]>([]);
  const [jobs, setJobs] = useState<VoraStudioJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('system');
  const [scheduleOffset, setScheduleOffset] = useState<(typeof SCHEDULE_OFFSETS)[number]['id']>('1h');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [w, b, j] = await Promise.all([
      fetchModeratorWorkload(),
      fetchScheduledBroadcasts(),
      fetchVoraStudioJobs(),
    ]);
    setWorkload(w);
    setBroadcasts(b);
    setJobs(j);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setBroadcastType('system');
    setScheduleOffset('1h');
  };

  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Hata', 'Başlık ve mesaj gerekli.');
      return;
    }

    const scheduledAt = offsetToIso(scheduleOffset);
    const label = new Date(scheduledAt).toLocaleString('tr-TR');

    if (editingId) {
      Alert.alert('Güncelle', `Duyuru ${label} tarihine güncellensin mi?`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async () => {
            setSaving(true);
            const { error } = await updateScheduledBroadcastLegacy(
              editingId,
              title.trim(),
              body.trim(),
              broadcastType,
              scheduledAt,
            );
            setSaving(false);
            if (error) Alert.alert('Hata', error);
            else {
              resetForm();
              load(true);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert('Zamanla', `${label} tarihinde gönderilecek şekilde planlansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Planla',
        onPress: async () => {
          setSaving(true);
          const { error } = await createScheduledBroadcastLegacy(
            title.trim(),
            body.trim(),
            broadcastType,
            scheduledAt,
          );
          setSaving(false);
          if (error) Alert.alert('Hata', error);
          else {
            resetForm();
            load(true);
          }
        },
      },
    ]);
  };

  const handleEdit = (b: ScheduledBroadcastRow) => {
    setEditingId(b.id);
    setTitle(b.title);
    setBody(b.body);
    setBroadcastType(b.broadcast_type as BroadcastType);
    setScheduleOffset('1h');
  };

  const handleCancel = (b: ScheduledBroadcastRow) => {
    Alert.alert('İptal et', `"${b.title}" zamanlanmış duyurusu iptal edilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          const { error } = await cancelScheduledBroadcast(b.id);
          if (error) Alert.alert('Hata', error);
          else {
            if (editingId === b.id) resetForm();
            load(true);
          }
        },
      },
    ]);
  };

  const handleDelete = (b: ScheduledBroadcastRow) => {
    Alert.alert('Kaldır', `"${b.title}" listeden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteScheduledBroadcast(b.id);
          if (error) Alert.alert('Hata', error);
          else {
            if (editingId === b.id) resetForm();
            load(true);
          }
        },
      },
    ]);
  };

  const pendingBroadcasts = broadcasts.filter(isBroadcastPending);

  return (
    <AdminShell
      title="Operasyon"
      subtitle="Moderatör yükü, zamanlanmış duyurular, Vora Studio"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : (
        <>
          <AdminSectionHeader title="Moderatör iş yükü" hint="Son 7 gün" />
          {workload.map((mod) => (
            <AdminStatCard
              key={mod.id}
              label={`@${mod.username}`}
              value={`${mod.assigned_reports} atanmış · ${mod.actions_7d} işlem`}
              icon="person"
            />
          ))}

          <AdminSectionHeader
            title="Zamanlanmış duyuru"
            hint={editingId ? 'Düzenleniyor' : 'Yeni planla'}
          />
          <GlassCard style={styles.form}>
            <AdminFormField placeholder="Başlık" value={title} onChangeText={setTitle} />
            <AdminFormField placeholder="Mesaj" value={body} onChangeText={setBody} multiline />
            <AdminFilterChip options={TYPE_OPTIONS} value={broadcastType} onChange={setBroadcastType} />
            <AdminFilterChip
              options={SCHEDULE_OFFSETS.map((o) => ({ id: o.id, label: o.label }))}
              value={scheduleOffset}
              onChange={setScheduleOffset}
            />
            <View style={styles.formActions}>
              {editingId ? (
                <AdminActionChip label="Vazgeç" icon="close-outline" onPress={resetForm} compact />
              ) : null}
              <AdminActionChip
                label={editingId ? 'Güncelle' : 'Planla'}
                icon={editingId ? 'save-outline' : 'time-outline'}
                tone="primary"
                onPress={handleSave}
                loading={saving}
                compact
              />
            </View>
          </GlassCard>

          {broadcasts.length === 0 ? (
            <AdminEmptyState title="Plan yok" message="Henüz zamanlanmış duyuru yok." icon="time-outline" />
          ) : (
            broadcasts.map((b) => (
              <GlassCard key={b.id} style={styles.row}>
                <Text variant="label">{b.title}</Text>
                <Text secondary numberOfLines={2}>
                  {b.body}
                </Text>
                <Text secondary variant="caption">
                  {new Date(b.scheduled_at).toLocaleString('tr-TR')} · {BROADCAST_TYPE_LABELS[b.broadcast_type as BroadcastType] ?? b.broadcast_type} · {broadcastStatusLabel(b)}
                </Text>
                {isBroadcastPending(b) ? (
                  <View style={styles.actionRow}>
                    <AdminActionChip label="Düzenle" icon="create-outline" onPress={() => handleEdit(b)} compact />
                    <AdminActionChip
                      label="İptal et"
                      icon="pause-circle-outline"
                      tone="warning"
                      onPress={() => handleCancel(b)}
                      compact
                    />
                    <AdminActionChip
                      label="Kaldır"
                      icon="trash-outline"
                      tone="danger"
                      onPress={() => handleDelete(b)}
                      compact
                    />
                  </View>
                ) : !b.is_sent ? (
                  <View style={styles.actionRow}>
                    <AdminActionChip
                      label="Kaldır"
                      icon="trash-outline"
                      tone="danger"
                      onPress={() => handleDelete(b)}
                      compact
                    />
                  </View>
                ) : null}
              </GlassCard>
            ))
          )}

          {pendingBroadcasts.length > 0 ? (
            <Text secondary variant="caption" style={styles.pendingHint}>
              {pendingBroadcasts.length} bekleyen duyuru
            </Text>
          ) : null}

          <AdminSectionHeader title="Vora Studio işleri" />
          {jobs.length === 0 ? (
            <AdminEmptyState title="İş yok" message="Render kuyruğu boş." icon="film-outline" />
          ) : (
            jobs.map((job) => (
              <GlassCard key={job.id} style={styles.row}>
                <Text variant="label">@{job.username}</Text>
                <Text secondary variant="caption">
                  {job.status} · {new Date(job.created_at).toLocaleString('tr-TR')}
                </Text>
                {job.error_message ? (
                  <Text secondary variant="caption" numberOfLines={2}>
                    {job.error_message}
                  </Text>
                ) : null}
                {job.status === 'queued' || job.status === 'processing' ? (
                  <AdminActionChip
                    label="İptal et"
                    icon="close-circle-outline"
                    tone="danger"
                    onPress={() => {
                      Alert.alert('İşi iptal et', 'Render işi iptal edilsin mi?', [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'İptal',
                          style: 'destructive',
                          onPress: async () => {
                            const { error } = await cancelVoraStudioJob(job.id);
                            if (error) Alert.alert('Hata', error);
                            else load(true);
                          },
                        },
                      ]);
                    }}
                  />
                ) : null}
                {job.status === 'failed' ? (
                  <AdminActionChip
                    label="Yeniden dene"
                    icon="refresh-outline"
                    tone="primary"
                    onPress={async () => {
                      const { error } = await retryVoraStudioJob(job.id);
                      if (error) Alert.alert('Hata', error);
                      else load(true);
                    }}
                  />
                ) : null}
              </GlassCard>
            ))
          )}
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  row: { gap: spacing.xs },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pendingHint: {
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
});
